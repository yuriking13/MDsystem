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
import { getUserApiKey } from "../utils/project-access.js";

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
   * Генерация embeddings для статей проекта
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

      const { articleIds, batchSize, includeReferences, includeCitedBy } =
        parsedBody.data;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
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

        // Получаем статьи для обработки - ВСЕ статьи графа
        let articles;
        if (articleIds && articleIds.length > 0) {
          // Если указаны конкретные ID - берём их
          articles = await pool.query(
            `SELECT a.id, a.title_en, a.abstract_en
             FROM articles a
             WHERE a.id = ANY($1)`,
            [articleIds],
          );
        } else {
          // Берем ВСЕ статьи графа без embeddings
          const query = `
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
                AND $3 = true
            ),
            cited_by_article_ids AS (
              SELECT DISTINCT cited_article.id
              FROM articles a
              JOIN project_articles pa ON pa.article_id = a.id
              CROSS JOIN LATERAL unnest(COALESCE(a.cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
              JOIN articles cited_article ON cited_article.pmid = cited_pmid
              WHERE pa.project_id = $1 AND pa.status != 'deleted'
                AND $4 = true
            ),
            all_graph_article_ids AS (
              SELECT id FROM project_article_ids
              UNION
              SELECT id FROM reference_article_ids
              UNION
              SELECT id FROM cited_by_article_ids
            )
            SELECT a.id, a.title_en, a.abstract_en
            FROM articles a
            JOIN all_graph_article_ids ag ON ag.id = a.id
            LEFT JOIN article_embeddings ae ON ae.article_id = a.id
            WHERE ae.article_id IS NULL
            LIMIT $2
          `;
          articles = await pool.query(query, [
            projectId,
            batchSize,
            includeReferences,
            includeCitedBy,
          ]);
        }

        const totalArticles = articles.rows.length;
        let processed = 0;
        let errors = 0;

        // Обрабатываем пакетами
        for (const article of articles.rows) {
          try {
            const text = [article.title_en, article.abstract_en]
              .filter(Boolean)
              .join(" ");

            if (!text.trim()) {
              errors++;
              continue;
            }

            const embedding = await generateEmbedding(text, apiKey);

            // Сохраняем embedding
            await pool.query(
              `INSERT INTO article_embeddings (article_id, embedding, model)
               VALUES ($1, $2, 'text-embedding-3-small')
               ON CONFLICT (article_id) 
               DO UPDATE SET 
                 embedding = EXCLUDED.embedding,
                 model = EXCLUDED.model,
                 updated_at = NOW()`,
              [article.id, `[${embedding.join(",")}]`],
            );

            // Обновляем статус
            await pool.query(
              `UPDATE articles SET embedding_status = 'completed' WHERE id = $1`,
              [article.id],
            );

            processed++;

            // Небольшая задержка для rate limiting
            if (processed % 10 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } catch (error: any) {
            fastify.log.error(
              `Failed to process article ${article.id}:`,
              error,
            );
            errors++;
          }
        }

        return {
          success: true,
          total: totalArticles,
          processed,
          errors,
          remaining: totalArticles - processed - errors,
        };
      } catch (error: any) {
        fastify.log.error("Generate embeddings error:", error);
        return reply.code(500).send({
          error: "Failed to generate embeddings",
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

// Helper function для генерации embeddings через OpenAI
async function generateEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
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
  return data.data[0].embedding;
}
