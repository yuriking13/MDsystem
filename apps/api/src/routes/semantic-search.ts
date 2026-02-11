/**
 * Semantic Search для графа цитирований
 *
 * Использует OpenAI embeddings для поиска похожих статей по смыслу
 * Работает даже без прямых цитирований
 */

import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { getUserId } from "../utils/auth-helpers.js";
import { getUserApiKey, checkProjectAccessPool } from "../utils/project-access.js";
import { queryEmbeddingCache } from "../utils/embedding-cache.js";
import { startBoss } from "../worker/boss.js";
import type { EmbeddingsJobPayload } from "../worker/types.js";

const semanticSearchQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7), // Cosine similarity threshold
});

const generateEmbeddingsBodySchema = z.object({
  articleIds: z.array(z.string()).optional(),
  batchSize: z.number().int().min(1).max(100).default(50),
  includeReferences: z.boolean().default(true), // Включать статьи из references
  includeCitedBy: z.boolean().default(true), // Включать статьи из cited_by
  importMissingArticles: z.boolean().default(false), // Импортировать недостающие статьи
});

export const semanticSearchRoutes: FastifyPluginCallback = (
  fastify,
  _opts,
  done,
) => {
  /**
   * POST /projects/:projectId/citation-graph/semantic-search
   * Семантический поиск по графу
   */
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof semanticSearchQuerySchema>;
  }>(
    "/projects/:projectId/citation-graph/semantic-search",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const parsedBody = semanticSearchQuerySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply
          .code(400)
          .send({ error: "Invalid request body", details: parsedBody.error });
      }

      const { query, limit, threshold } = parsedBody.data;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        // Получаем API ключ OpenRouter пользователя
        const apiKey = await getUserApiKey(userId, "openrouter");
        if (!apiKey) {
          return reply.code(400).send({
            error:
              "OpenRouter API key not configured. Please add it in settings.",
          });
        }

        // Проверяем существование таблицы article_embeddings
        const tableCheck = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'article_embeddings'
          )`,
        );
        if (!tableCheck.rows[0].exists) {
          return reply.code(400).send({
            error:
              "Semantic search not available. Please run database migration first.",
            details: "Table article_embeddings does not exist",
          });
        }

        // Проверяем, включено ли расширение pgvector
        const vectorCheck = await pool.query(
          `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')`,
        );
        if (!vectorCheck.rows[0].exists) {
          return reply.code(400).send({
            error:
              "Semantic search not available. pgvector extension not installed.",
          });
        }

        // Генерируем embedding для запроса
        const queryEmbedding = await generateEmbedding(query, apiKey);

        // Ищем похожие статьи во ВСЁМ графе (проект + references + cited_by)
        const results = await pool.query(
          `WITH project_article_ids AS (
            SELECT a.id FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            WHERE pa.project_id = $2 AND pa.status != 'deleted'
          ),
          reference_article_ids AS (
            SELECT DISTINCT ref_article.id
            FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            CROSS JOIN LATERAL unnest(COALESCE(a.reference_pmids, ARRAY[]::text[])) AS ref_pmid
            JOIN articles ref_article ON ref_article.pmid = ref_pmid
            WHERE pa.project_id = $2 AND pa.status != 'deleted'
          ),
          cited_by_article_ids AS (
            SELECT DISTINCT cited_article.id
            FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            CROSS JOIN LATERAL unnest(COALESCE(a.cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
            JOIN articles cited_article ON cited_article.pmid = cited_pmid
            WHERE pa.project_id = $2 AND pa.status != 'deleted'
          ),
          all_graph_article_ids AS (
            SELECT id FROM project_article_ids
            UNION SELECT id FROM reference_article_ids
            UNION SELECT id FROM cited_by_article_ids
          )
          SELECT 
             a.id,
             a.title_en,
             a.title_ru,
             a.abstract_en,
             a.year,
             a.authors,
             a.journal,
             a.doi,
             a.pmid,
             CASE 
               WHEN pa.article_id IS NOT NULL THEN pa.status 
               ELSE 'reference' 
             END as status,
             1 - (ae.embedding <=> $1::vector) as similarity
           FROM article_embeddings ae
           JOIN articles a ON a.id = ae.article_id
           JOIN all_graph_article_ids ag ON ag.id = a.id
           LEFT JOIN project_articles pa ON pa.article_id = a.id AND pa.project_id = $2
           WHERE 1 - (ae.embedding <=> $1::vector) >= $3
           ORDER BY similarity DESC
           LIMIT $4`,
          [`[${queryEmbedding.join(",")}]`, projectId, threshold, limit],
        );

        return {
          query,
          results: results.rows.map((row: any) => ({
            id: row.id,
            title: row.title_ru || row.title_en,
            titleEn: row.title_en,
            abstract: row.abstract_en,
            year: row.year,
            authors: row.authors,
            journal: row.journal,
            doi: row.doi,
            pmid: row.pmid,
            status: row.status,
            similarity: parseFloat(row.similarity),
          })),
          totalFound: results.rows.length,
          threshold,
        };
      } catch (error: any) {
        fastify.log.error("Semantic search error:", error);
        return reply.code(500).send({
          error: "Failed to perform semantic search",
          details: error.message,
        });
      }
    },
  );

  /**
   * POST /projects/:projectId/citation-graph/generate-embeddings
   * Запуск асинхронной генерации embeddings для статей проекта
   */
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof generateEmbeddingsBodySchema>;
  }>(
    "/projects/:projectId/citation-graph/generate-embeddings",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const parsedBody = generateEmbeddingsBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply
          .code(400)
          .send({ error: "Invalid request body", details: parsedBody.error });
      }

      const {
        articleIds,
        batchSize,
        includeReferences,
        includeCitedBy,
        importMissingArticles,
      } = parsedBody.data;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        // Получаем API ключ OpenRouter пользователя
        const apiKey = await getUserApiKey(userId, "openrouter");
        if (!apiKey) {
          return reply.code(400).send({
            error:
              "OpenRouter API key required to generate embeddings. Add it in user settings.",
          });
        }

        // Проверяем, нет ли уже активного job
        const activeJob = await pool.query(
          `SELECT id, status, processed, total FROM embedding_jobs 
           WHERE project_id = $1 AND status IN ('pending', 'running')
           ORDER BY created_at DESC LIMIT 1`,
          [projectId],
        );

        if (activeJob.rows.length > 0) {
          const job = activeJob.rows[0];
          return {
            jobId: job.id,
            status: job.status,
            processed: job.processed,
            total: job.total,
            message: "Embedding generation already in progress",
          };
        }

        // Посчитаем сколько всего статей в графе без embeddings
        let missingCount = 0;
        if (articleIds && articleIds.length > 0) {
          const res = await pool.query(
            `SELECT COUNT(*) AS cnt FROM article_embeddings WHERE article_id = ANY($1)`,
            [articleIds],
          );
          missingCount = articleIds.length - parseInt(res.rows[0].cnt, 10);
        } else {
          const missingQuery = `
            WITH project_article_ids AS (
              SELECT a.id
              FROM articles a
              JOIN project_articles pa ON pa.article_id = a.id
              WHERE pa.project_id = $1 AND pa.status != 'deleted'
            ),
            reference_article_ids AS (
              SELECT DISTINCT ref_article.id
              FROM articles a
              JOIN project_articles pa ON pa.article_id = a.id
              CROSS JOIN LATERAL unnest(COALESCE(a.reference_pmids, ARRAY[]::text[])) AS ref_pmid
              JOIN articles ref_article ON ref_article.pmid = ref_pmid
              WHERE pa.project_id = $1 AND pa.status != 'deleted'
                AND $2 = true
            ),
            cited_by_article_ids AS (
              SELECT DISTINCT cited_article.id
              FROM articles a
              JOIN project_articles pa ON pa.article_id = a.id
              CROSS JOIN LATERAL unnest(COALESCE(a.cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
              JOIN articles cited_article ON cited_article.pmid = cited_pmid
              WHERE pa.project_id = $1 AND pa.status != 'deleted'
                AND $3 = true
            ),
            all_graph_article_ids AS (
              SELECT id FROM project_article_ids
              UNION
              SELECT id FROM reference_article_ids
              UNION
              SELECT id FROM cited_by_article_ids
            )
            SELECT COUNT(*) AS missing
            FROM all_graph_article_ids ag
            LEFT JOIN article_embeddings ae ON ae.article_id = ag.id
            WHERE ae.article_id IS NULL
          `;
          const res = await pool.query(missingQuery, [
            projectId,
            includeReferences,
            includeCitedBy,
          ]);
          missingCount = parseInt(res.rows[0].missing, 10);
        }

        // Если нечего обрабатывать (и не нужно импортировать)
        if (missingCount <= 0 && !importMissingArticles) {
          return {
            jobId: null,
            status: "completed",
            total: 0,
            processed: 0,
            errors: 0,
            message: "All articles already have embeddings",
          };
        }

        // Создаём job в базе
        const jobResult = await pool.query(
          `INSERT INTO embedding_jobs (project_id, user_id, total, include_references, include_cited_by)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [projectId, userId, missingCount, includeReferences, includeCitedBy],
        );
        const jobId = jobResult.rows[0].id;

        // Запускаем pg-boss job
        const boss = await startBoss();
        const payload: EmbeddingsJobPayload = {
          projectId,
          userId,
          jobId,
          articleIds: articleIds || null,
          includeReferences,
          includeCitedBy,
          batchSize,
          importMissingArticles,
        };
        await boss.send("embeddings:generate", payload);

        fastify.log.info(
          `Started embeddings job ${jobId} for project ${projectId}`,
        );

        return {
          jobId,
          status: "pending",
          total: missingCount,
          processed: 0,
          errors: 0,
          message: "Embedding generation started",
        };
      } catch (error: any) {
        fastify.log.error("Generate embeddings error:", error);
        return reply.code(500).send({
          error: "Failed to start embedding generation",
          details: error.message,
        });
      }
    },
  );

  /**
   * GET /projects/:projectId/citation-graph/embedding-job/:jobId
   * Получить статус job генерации embeddings
   */
  fastify.get<{
    Params: { projectId: string; jobId: string };
  }>(
    "/projects/:projectId/citation-graph/embedding-job/:jobId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId, jobId } = request.params;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        const result = await pool.query(
          `SELECT id, status, total, processed, errors, error_message, 
                  created_at, started_at, completed_at
           FROM embedding_jobs
           WHERE id = $1 AND project_id = $2`,
          [jobId, projectId],
        );

        if (result.rows.length === 0) {
          return reply.code(404).send({ error: "Job not found" });
        }

        const job = result.rows[0];
        return {
          jobId: job.id,
          status: job.status,
          total: job.total,
          processed: job.processed,
          errors: job.errors,
          errorMessage: job.error_message,
          createdAt: job.created_at,
          startedAt: job.started_at,
          completedAt: job.completed_at,
        };
      } catch (error: any) {
        fastify.log.error("Get embedding job error:", error);
        return reply.code(500).send({
          error: "Failed to get job status",
          details: error.message,
        });
      }
    },
  );

  /**
   * POST /projects/:projectId/citation-graph/embedding-job/:jobId/cancel
   * Отменить job генерации embeddings
   */
  fastify.post<{
    Params: { projectId: string; jobId: string };
  }>(
    "/projects/:projectId/citation-graph/embedding-job/:jobId/cancel",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId, jobId } = request.params;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        const result = await pool.query(
          `UPDATE embedding_jobs 
           SET status = 'cancelled'
           WHERE id = $1 AND project_id = $2 AND status IN ('pending', 'running')
           RETURNING id, status`,
          [jobId, projectId],
        );

        if (result.rows.length === 0) {
          return reply
            .code(404)
            .send({ error: "Job not found or already finished" });
        }

        return { success: true, jobId, status: "cancelled" };
      } catch (error: any) {
        fastify.log.error("Cancel embedding job error:", error);
        return reply.code(500).send({
          error: "Failed to cancel job",
          details: error.message,
        });
      }
    },
  );

  /**
   * GET /projects/:projectId/citation-graph/embedding-jobs
   * Получить список последних jobs для проекта
   */
  fastify.get<{
    Params: { projectId: string };
  }>(
    "/projects/:projectId/citation-graph/embedding-jobs",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        const result = await pool.query(
          `SELECT id, status, total, processed, errors, error_message, 
                  created_at, started_at, completed_at
           FROM embedding_jobs
           WHERE project_id = $1
           ORDER BY created_at DESC
           LIMIT 10`,
          [projectId],
        );

        return {
          jobs: result.rows.map((job) => ({
            jobId: job.id,
            status: job.status,
            total: job.total,
            processed: job.processed,
            errors: job.errors,
            errorMessage: job.error_message,
            createdAt: job.created_at,
            startedAt: job.started_at,
            completedAt: job.completed_at,
          })),
        };
      } catch (error: any) {
        fastify.log.error("Get embedding jobs error:", error);
        return reply.code(500).send({
          error: "Failed to get jobs",
          details: error.message,
        });
      }
    },
  );

  /**
   * GET /projects/:projectId/citation-graph/missing-articles-stats
   * Статистика недостающих статей для импорта
   */
  fastify.get<{
    Params: { projectId: string };
  }>(
    "/projects/:projectId/citation-graph/missing-articles-stats",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        // PMIDs только из cited_by (цитирующие статьи), которых нет в articles
        // Лимит на импорт - 1000 самых релевантных (по частоте цитирования)
        const IMPORT_LIMIT = 1000;

        const missingCitedByQuery = `
          WITH project_articles AS (
            SELECT a.id, a.cited_by_pmids
            FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            WHERE pa.project_id = $1 AND pa.status != 'deleted'
          ),
          all_cited_pmids AS (
            SELECT DISTINCT cited_pmid
            FROM project_articles
            CROSS JOIN LATERAL unnest(COALESCE(cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
            WHERE cited_pmid IS NOT NULL AND cited_pmid != ''
          )
          SELECT COUNT(*) as total_missing
          FROM all_cited_pmids
          WHERE NOT EXISTS (SELECT 1 FROM articles WHERE pmid = all_cited_pmids.cited_pmid)
        `;

        const citedByResult = await pool.query(missingCitedByQuery, [
          projectId,
        ]);
        const totalMissingCited = parseInt(
          citedByResult.rows[0].total_missing,
          10,
        );

        // Реально импортируем только топ-1000
        const willImport = Math.min(totalMissingCited, IMPORT_LIMIT);

        return {
          missingPmids: willImport,
          missingPmidsFromReferences: 0,
          missingPmidsFromCitedBy: willImport,
          missingDois: 0,
          totalMissing: willImport,
          totalAvailable: totalMissingCited, // Всего доступно
          importLimit: IMPORT_LIMIT,
        };
      } catch (error: any) {
        fastify.log.error("Missing articles stats error:", error);
        return reply.code(500).send({
          error: "Failed to get missing articles stats",
          details: error.message,
        });
      }
    },
  );

  /**
   * GET /projects/:projectId/citation-graph/embedding-stats
   * Статистика embeddings для проекта
   */
  fastify.get<{
    Params: { projectId: string };
  }>(
    "/projects/:projectId/citation-graph/embedding-stats",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        // Проверяем существование таблицы article_embeddings
        const tableCheck = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'article_embeddings'
          )`,
        );
        const tableExists = tableCheck.rows[0].exists;

        if (!tableExists) {
          // Таблица не существует - считаем ВСЕ статьи графа
          const countRes = await pool.query(
            `WITH project_article_ids AS (
              SELECT a.id FROM articles a
              JOIN project_articles pa ON pa.article_id = a.id
              WHERE pa.project_id = $1 AND pa.status != 'deleted'
            ),
            reference_article_ids AS (
              SELECT DISTINCT ref_article.id
              FROM articles a
              JOIN project_articles pa ON pa.article_id = a.id
              CROSS JOIN LATERAL unnest(COALESCE(a.reference_pmids, ARRAY[]::text[])) AS ref_pmid
              JOIN articles ref_article ON ref_article.pmid = ref_pmid
              WHERE pa.project_id = $1 AND pa.status != 'deleted'
            ),
            cited_by_article_ids AS (
              SELECT DISTINCT cited_article.id
              FROM articles a
              JOIN project_articles pa ON pa.article_id = a.id
              CROSS JOIN LATERAL unnest(COALESCE(a.cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
              JOIN articles cited_article ON cited_article.pmid = cited_pmid
              WHERE pa.project_id = $1 AND pa.status != 'deleted'
            ),
            all_graph_article_ids AS (
              SELECT id FROM project_article_ids
              UNION SELECT id FROM reference_article_ids
              UNION SELECT id FROM cited_by_article_ids
            )
            SELECT COUNT(*) as total_articles FROM all_graph_article_ids`,
            [projectId],
          );
          const total = parseInt(countRes.rows[0].total_articles);
          return {
            totalArticles: total,
            withEmbeddings: 0,
            withoutEmbeddings: total,
            completionRate: 0,
            message:
              "Embedding table not initialized. Run migration add_semantic_search.sql",
          };
        }

        // Считаем статистику для ВСЕХ статей графа
        const stats = await pool.query(
          `WITH project_article_ids AS (
            SELECT a.id FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            WHERE pa.project_id = $1 AND pa.status != 'deleted'
          ),
          reference_article_ids AS (
            SELECT DISTINCT ref_article.id
            FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            CROSS JOIN LATERAL unnest(COALESCE(a.reference_pmids, ARRAY[]::text[])) AS ref_pmid
            JOIN articles ref_article ON ref_article.pmid = ref_pmid
            WHERE pa.project_id = $1 AND pa.status != 'deleted'
          ),
          cited_by_article_ids AS (
            SELECT DISTINCT cited_article.id
            FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            CROSS JOIN LATERAL unnest(COALESCE(a.cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
            JOIN articles cited_article ON cited_article.pmid = cited_pmid
            WHERE pa.project_id = $1 AND pa.status != 'deleted'
          ),
          all_graph_article_ids AS (
            SELECT id FROM project_article_ids
            UNION SELECT id FROM reference_article_ids
            UNION SELECT id FROM cited_by_article_ids
          )
          SELECT 
            COUNT(DISTINCT ag.id) as total_articles,
            COUNT(DISTINCT ae.article_id) as articles_with_embeddings,
            COUNT(DISTINCT ag.id) - COUNT(DISTINCT ae.article_id) as articles_without_embeddings
          FROM all_graph_article_ids ag
          LEFT JOIN article_embeddings ae ON ae.article_id = ag.id`,
          [projectId],
        );

        const row = stats.rows[0];
        return {
          totalArticles: parseInt(row.total_articles),
          withEmbeddings: parseInt(row.articles_with_embeddings),
          withoutEmbeddings: parseInt(row.articles_without_embeddings),
          completionRate:
            parseInt(row.total_articles) > 0
              ? (parseInt(row.articles_with_embeddings) /
                  parseInt(row.total_articles)) *
                100
              : 0,
        };
      } catch (error: any) {
        fastify.log.error("Embedding stats error:", error);
        return reply.code(500).send({
          error: "Failed to get embedding stats",
          details: error.message,
        });
      }
    },
  );

  /**
   * GET /projects/:projectId/citation-graph/semantic-neighbors
   * Получить семантических соседей для всех статей (для визуализации семантического ядра)
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: { threshold?: string; limit?: string };
  }>(
    "/projects/:projectId/citation-graph/semantic-neighbors",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const threshold = parseFloat(request.query.threshold || "0.75");
      // limit parameter reserved for future use
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        // Получаем все пары статей с высоким similarity
        const neighbors = await pool.query(
          `WITH project_article_ids AS (
            SELECT a.id FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            WHERE pa.project_id = $1 AND pa.status != 'deleted'
          ),
          reference_article_ids AS (
            SELECT DISTINCT ref_article.id
            FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            CROSS JOIN LATERAL unnest(COALESCE(a.reference_pmids, ARRAY[]::text[])) AS ref_pmid
            JOIN articles ref_article ON ref_article.pmid = ref_pmid
            WHERE pa.project_id = $1 AND pa.status != 'deleted'
          ),
          cited_by_article_ids AS (
            SELECT DISTINCT cited_article.id
            FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            CROSS JOIN LATERAL unnest(COALESCE(a.cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
            JOIN articles cited_article ON cited_article.pmid = cited_pmid
            WHERE pa.project_id = $1 AND pa.status != 'deleted'
          ),
          all_graph_article_ids AS (
            SELECT id FROM project_article_ids
            UNION SELECT id FROM reference_article_ids
            UNION SELECT id FROM cited_by_article_ids
          ),
          article_pairs AS (
            SELECT 
              ae1.article_id as source_id,
              ae2.article_id as target_id,
              1 - (ae1.embedding <=> ae2.embedding) as similarity
            FROM article_embeddings ae1
            JOIN article_embeddings ae2 ON ae1.article_id < ae2.article_id
            JOIN all_graph_article_ids ag1 ON ag1.id = ae1.article_id
            JOIN all_graph_article_ids ag2 ON ag2.id = ae2.article_id
            WHERE 1 - (ae1.embedding <=> ae2.embedding) >= $2
          )
          SELECT source_id, target_id, similarity
          FROM article_pairs
          ORDER BY similarity DESC
          LIMIT 1000`,
          [projectId, threshold],
        );

        // Группируем по статьям для статистики
        const articleStats: Record<
          string,
          { count: number; avgSimilarity: number }
        > = {};

        for (const row of neighbors.rows) {
          if (!articleStats[row.source_id]) {
            articleStats[row.source_id] = { count: 0, avgSimilarity: 0 };
          }
          if (!articleStats[row.target_id]) {
            articleStats[row.target_id] = { count: 0, avgSimilarity: 0 };
          }
          articleStats[row.source_id].count++;
          articleStats[row.target_id].count++;
          articleStats[row.source_id].avgSimilarity += parseFloat(
            row.similarity,
          );
          articleStats[row.target_id].avgSimilarity += parseFloat(
            row.similarity,
          );
        }

        // Вычисляем средние
        for (const id of Object.keys(articleStats)) {
          if (articleStats[id].count > 0) {
            articleStats[id].avgSimilarity /= articleStats[id].count;
          }
        }

        return {
          edges: neighbors.rows.map((row: any) => ({
            source: row.source_id,
            target: row.target_id,
            similarity: parseFloat(row.similarity),
          })),
          articleStats,
          threshold,
          totalEdges: neighbors.rows.length,
        };
      } catch (error: any) {
        fastify.log.error("Semantic neighbors error:", error);
        return reply.code(500).send({
          error: "Failed to get semantic neighbors",
          details: error.message,
        });
      }
    },
  );

  done();
};

// Helper function для генерации embeddings через OpenAI с кэшированием
async function generateEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
  // Проверяем кэш
  const cached = queryEmbeddingCache.get(text);
  if (cached) {
    return cached;
  }

  // OpenRouter совместим с OpenAI API для embeddings
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://lilitomukib.beget.app",
      "X-Title": "MDsystem",
    },
    body: JSON.stringify({
      input: text.trim().slice(0, 8000), // Truncate to limit
      model: "openai/text-embedding-3-small",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  const embedding = data.data[0].embedding;

  // Сохраняем в кэш
  queryEmbeddingCache.set(text, embedding);

  return embedding;
}
