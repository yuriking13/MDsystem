/**
 * Семантические кластеры для графа цитирований
 *
 * Алгоритм:
 * 1. Загружаем embeddings всех статей графа
 * 2. Кластеризуем через K-Means или DBSCAN
 * 3. Определяем центральные статьи кластеров
 * 4. Генерируем названия через GPT
 */

import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { getUserId } from "../utils/auth-helpers.js";
import {
  getUserApiKey,
  checkProjectAccessPool,
} from "../utils/project-access.js";

// Цвета для кластеров
const CLUSTER_COLORS = [
  "#6366f1", // Indigo
  "#22c55e", // Green
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#8b5cf6", // Violet
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#ef4444", // Red
  "#84cc16", // Lime
  "#a855f7", // Purple
  "#3b82f6", // Blue
];

const clusterSettingsSchema = z.object({
  numClusters: z.number().int().min(2).max(20).default(5),
  minClusterSize: z.number().int().min(2).max(50).default(3),
  similarityThreshold: z.number().min(0.3).max(0.95).default(0.6),
  generateNames: z.boolean().default(true),
});

const gapAnalysisSchema = z.object({
  threshold: z.number().min(0.5).max(0.95).default(0.7),
  limit: z.number().int().min(1).max(200).default(50),
  yearFrom: z.number().int().min(1900).max(2100).optional(),
  yearTo: z.number().int().min(1900).max(2100).optional(),
});

const smartSemanticSearchSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  threshold: z.number().min(0).max(1).default(0.6),
  limit: z.number().int().min(1).max(100).default(20),
  clusterId: z.string().uuid().optional(),
  includeGapAnalysis: z.boolean().optional(),
});

type SemanticNeighborRow = {
  article_id: string;
  title_en: string | null;
  title_ru: string | null;
  year: number | null;
  similarity: string | number;
  cluster_id: string | null;
  cluster_name: string | null;
  cluster_color: string | null;
  has_direct_citation: boolean;
};

type GapAnalysisRow = {
  article1_id: string;
  article2_id: string;
  similarity: string | number;
  article1_title: string | null;
  article1_year: number | null;
  article2_title: string | null;
  article2_year: number | null;
};

type SmartSearchRow = {
  id: string;
  title_en: string | null;
  title_ru: string | null;
  abstract_en: string | null;
  year: number | null;
  authors: string[] | null;
  journal: string | null;
  doi: string | null;
  pmid: string | null;
  status: string;
  similarity: string | number;
  cluster_id: string | null;
  cluster_name: string | null;
  cluster_color: string | null;
};

type SmartSearchArticle = {
  id: string;
  title: string | null;
  titleEn: string | null;
  abstract: string | null;
  year: number | null;
  authors: string[] | null;
  journal: string | null;
  doi: string | null;
  pmid: string | null;
  status: string;
  similarity: number;
  clusterId: string | null;
  clusterName: string | null;
  clusterColor: string | null;
};

type ClusterSearchGroup = {
  cluster: { id: string; name: string | null; color: string | null };
  articles: SmartSearchArticle[];
};

export const semanticClustersRoutes: FastifyPluginCallback = (
  fastify,
  _opts,
  done,
) => {
  /**
   * POST /projects/:projectId/citation-graph/semantic-clusters
   * Создать/обновить семантические кластеры
   */
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof clusterSettingsSchema>;
  }>(
    "/projects/:projectId/citation-graph/semantic-clusters",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const parsedBody = clusterSettingsSchema.safeParse(request.body || {});

      if (!parsedBody.success) {
        return reply
          .code(400)
          .send({ error: "Invalid request body", details: parsedBody.error });
      }

      const {
        numClusters,
        minClusterSize,
        similarityThreshold,
        generateNames,
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
        // Получаем API ключ для генерации названий
        const apiKey = generateNames
          ? await getUserApiKey(userId, "openrouter")
          : null;

        // Получаем все embeddings статей графа
        const embeddingsResult = await pool.query(
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
          SELECT ae.article_id, ae.embedding::text, a.title_en, a.abstract_en
          FROM article_embeddings ae
          JOIN all_graph_article_ids ag ON ag.id = ae.article_id
          JOIN articles a ON a.id = ae.article_id`,
          [projectId],
        );

        if (embeddingsResult.rows.length < minClusterSize * 2) {
          return reply.code(400).send({
            error: "Not enough articles with embeddings",
            details: `Found ${embeddingsResult.rows.length} articles, need at least ${minClusterSize * 2}`,
          });
        }

        // Парсим embeddings
        const articles = embeddingsResult.rows.map((row) => ({
          id: row.article_id,
          title: row.title_en || "",
          abstract: row.abstract_en || "",
          embedding: parseEmbedding(row.embedding),
        }));

        // Выполняем K-Means кластеризацию
        const actualNumClusters = Math.min(
          numClusters,
          Math.floor(articles.length / minClusterSize),
        );
        const clusters = kMeansClustering(
          articles,
          actualNumClusters,
          similarityThreshold,
        );

        // Фильтруем маленькие кластеры
        const validClusters = clusters.filter(
          (c) => c.members.length >= minClusterSize,
        );

        // Удаляем старые кластеры проекта
        await pool.query(
          `DELETE FROM semantic_clusters WHERE project_id = $1`,
          [projectId],
        );

        // Создаём новые кластеры
        const createdClusters = [];

        for (let i = 0; i < validClusters.length; i++) {
          const cluster = validClusters[i];
          const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];

          // Определяем центральную статью (максимум связей внутри кластера)
          const centralArticle = findCentralArticle(cluster.members, articles);

          // Генерируем название кластера
          let clusterName = `Кластер ${i + 1}`;
          let clusterNameEn = `Cluster ${i + 1}`;

          if (generateNames && apiKey) {
            try {
              const titles = cluster.members
                .slice(0, 10)
                .map((m) => m.title)
                .filter(Boolean);
              const generatedName = await generateClusterName(titles, apiKey);
              clusterName = generatedName.ru;
              clusterNameEn = generatedName.en;
            } catch (err) {
              const errorMessage =
                err instanceof Error ? err.message : String(err);
              fastify.log.warn(
                `Failed to generate cluster name: ${errorMessage}`,
              );
            }
          }

          // Извлекаем ключевые слова из названий
          const keywords = extractKeywords(
            cluster.members.map((m) => m.title).filter(Boolean),
          );

          // Сохраняем кластер
          const clusterResult = await pool.query(
            `INSERT INTO semantic_clusters 
             (project_id, name, name_en, color, keywords, central_article_id, avg_internal_similarity)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              projectId,
              clusterName,
              clusterNameEn,
              color,
              keywords,
              centralArticle?.id || null,
              cluster.avgSimilarity,
            ],
          );

          const clusterId = clusterResult.rows[0].id;

          // Сохраняем связи статей с кластером
          for (const member of cluster.members) {
            const simToCenter = centralArticle
              ? cosineSimilarity(member.embedding, centralArticle.embedding)
              : 0;

            await pool.query(
              `INSERT INTO semantic_cluster_articles (cluster_id, article_id, similarity_to_center)
               VALUES ($1, $2, $3)
               ON CONFLICT (cluster_id, article_id) DO UPDATE SET similarity_to_center = $3`,
              [clusterId, member.id, simToCenter],
            );
          }

          createdClusters.push({
            id: clusterId,
            name: clusterName,
            nameEn: clusterNameEn,
            color,
            articleCount: cluster.members.length,
            centralArticleId: centralArticle?.id || null,
            centralArticleTitle: centralArticle?.title || null,
            keywords,
            avgInternalSimilarity: cluster.avgSimilarity,
            articleIds: cluster.members.map((m) => m.id),
          });
        }

        // Статьи без кластера
        const clusteredIds = new Set(
          validClusters.flatMap((c) => c.members.map((m) => m.id)),
        );
        const unclustered = articles
          .filter((a) => !clusteredIds.has(a.id))
          .map((a) => a.id);

        return {
          success: true,
          clusters: createdClusters,
          unclustered,
          stats: {
            totalClusters: createdClusters.length,
            totalArticles: articles.length,
            clusteredArticles: articles.length - unclustered.length,
            avgClusterSize:
              createdClusters.length > 0
                ? Math.round(
                    (articles.length - unclustered.length) /
                      createdClusters.length,
                  )
                : 0,
          },
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Semantic clustering error");
        return reply.code(500).send({
          error: "Failed to create semantic clusters",
          message: "Internal server error",
        });
      }
    },
  );

  /**
   * GET /projects/:projectId/citation-graph/semantic-clusters
   * Получить существующие семантические кластеры
   */
  fastify.get<{
    Params: { projectId: string };
  }>(
    "/projects/:projectId/citation-graph/semantic-clusters",
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
        // Проверяем существование таблицы
        const tableCheck = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'semantic_clusters'
          )`,
        );

        if (!tableCheck.rows[0].exists) {
          return {
            clusters: [],
            unclustered: [],
            stats: {
              totalClusters: 0,
              totalArticles: 0,
              clusteredArticles: 0,
              avgClusterSize: 0,
            },
          };
        }

        // Получаем кластеры с количеством статей
        const clustersResult = await pool.query(
          `SELECT 
            sc.id,
            sc.name,
            sc.name_en,
            sc.color,
            sc.keywords,
            sc.central_article_id,
            sc.avg_internal_similarity,
            a.title_en as central_article_title,
            COUNT(sca.article_id) as article_count,
            array_agg(sca.article_id) as article_ids
          FROM semantic_clusters sc
          LEFT JOIN semantic_cluster_articles sca ON sca.cluster_id = sc.id
          LEFT JOIN articles a ON a.id = sc.central_article_id
          WHERE sc.project_id = $1
          GROUP BY sc.id, a.title_en
          ORDER BY article_count DESC`,
          [projectId],
        );

        // Получаем общее количество статей графа с embeddings
        const totalResult = await pool.query(
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
          SELECT COUNT(DISTINCT ae.article_id) as total
          FROM all_graph_article_ids ag
          JOIN article_embeddings ae ON ae.article_id = ag.id`,
          [projectId],
        );

        const clusters = clustersResult.rows.map((row) => ({
          id: row.id,
          name: row.name,
          nameEn: row.name_en,
          color: row.color,
          articleCount: parseInt(row.article_count),
          centralArticleId: row.central_article_id,
          centralArticleTitle: row.central_article_title,
          keywords: row.keywords || [],
          avgInternalSimilarity: row.avg_internal_similarity,
          articleIds: row.article_ids?.filter(Boolean) || [],
        }));

        const clusteredIds = new Set(clusters.flatMap((c) => c.articleIds));
        const totalArticles = parseInt(totalResult.rows[0]?.total || "0");

        // Получаем некластеризованные статьи (статьи с embeddings, но не в кластерах)
        const unclusteredResult = await pool.query(
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
          clustered_article_ids AS (
            SELECT article_id FROM semantic_cluster_articles sca
            JOIN semantic_clusters sc ON sc.id = sca.cluster_id
            WHERE sc.project_id = $1
          )
          SELECT a.id, a.title_en, a.title_ru, a.year
          FROM all_graph_article_ids ag
          JOIN article_embeddings ae ON ae.article_id = ag.id
          JOIN articles a ON a.id = ag.id
          WHERE ag.id NOT IN (SELECT article_id FROM clustered_article_ids)
          ORDER BY a.year DESC NULLS LAST
          LIMIT 100`,
          [projectId],
        );

        const unclustered = unclusteredResult.rows.map((row) => ({
          id: row.id,
          title: row.title_ru || row.title_en,
          year: row.year,
        }));

        return {
          clusters,
          unclustered,
          stats: {
            totalClusters: clusters.length,
            totalArticles,
            clusteredArticles: clusteredIds.size,
            unclusteredArticles: totalArticles - clusteredIds.size,
            avgClusterSize:
              clusters.length > 0
                ? Math.round(clusteredIds.size / clusters.length)
                : 0,
          },
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        fastify.log.error({ error: message }, "Get semantic clusters error");
        return reply.code(500).send({
          error: "Failed to get semantic clusters",
          message: "Internal server error",
        });
      }
    },
  );

  /**
   * GET /projects/:projectId/articles/:articleId/semantic-neighbors
   * Получить семантических соседей для конкретной статьи
   */
  fastify.get<{
    Params: { projectId: string; articleId: string };
    Querystring: { threshold?: string; limit?: string };
  }>(
    "/projects/:projectId/articles/:articleId/semantic-neighbors",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId, articleId } = request.params;
      const threshold = parseFloat(request.query.threshold || "0.6");
      const limit = parseInt(request.query.limit || "20");
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        // Получаем embedding статьи
        const articleEmbedding = await pool.query(
          `SELECT embedding::text FROM article_embeddings WHERE article_id = $1`,
          [articleId],
        );

        if (articleEmbedding.rows.length === 0) {
          return reply.code(404).send({
            error: "Article embedding not found",
          });
        }

        // Ищем соседей в графе проекта
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
          )
          SELECT 
            ae.article_id,
            a.title_en,
            a.title_ru,
            a.year,
            1 - (ae.embedding <=> $2::vector) as similarity,
            sc.id as cluster_id,
            sc.name as cluster_name,
            sc.color as cluster_color,
            EXISTS (
              SELECT 1 FROM articles src
              WHERE src.id = $3 
              AND (src.reference_pmids @> ARRAY[a.pmid] OR a.reference_pmids @> ARRAY[src.pmid])
            ) as has_direct_citation
          FROM article_embeddings ae
          JOIN all_graph_article_ids ag ON ag.id = ae.article_id
          JOIN articles a ON a.id = ae.article_id
          LEFT JOIN semantic_cluster_articles sca
            ON sca.article_id = ae.article_id
           AND EXISTS (
             SELECT 1 FROM semantic_clusters scx
             WHERE scx.id = sca.cluster_id AND scx.project_id = $1
           )
          LEFT JOIN semantic_clusters sc ON sc.id = sca.cluster_id
          WHERE ae.article_id != $3
            AND 1 - (ae.embedding <=> $2::vector) >= $4
          ORDER BY similarity DESC
          LIMIT $5`,
          [
            projectId,
            articleEmbedding.rows[0].embedding,
            articleId,
            threshold,
            limit,
          ],
        );

        const neighborRows = neighbors.rows as SemanticNeighborRow[];
        return {
          articleId,
          neighbors: neighborRows.map((row) => ({
            articleId: row.article_id,
            title: row.title_ru || row.title_en,
            titleEn: row.title_en,
            year: row.year,
            similarity: parseFloat(String(row.similarity)),
            clusterId: row.cluster_id,
            clusterName: row.cluster_name,
            clusterColor: row.cluster_color,
            hasDirectCitation: row.has_direct_citation,
          })),
          threshold,
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Get semantic neighbors error");
        return reply.code(500).send({
          error: "Failed to get semantic neighbors",
          message: "Internal server error",
        });
      }
    },
  );

  /**
   * POST /projects/:projectId/citation-graph/gap-analysis
   * Найти пропущенные связи (статьи похожие по смыслу, но не цитирующие друг друга)
   */
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof gapAnalysisSchema>;
  }>(
    "/projects/:projectId/citation-graph/gap-analysis",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const parsedBody = gapAnalysisSchema.safeParse(request.body || {});

      if (!parsedBody.success) {
        return reply
          .code(400)
          .send({ error: "Invalid request body", details: parsedBody.error });
      }

      const { threshold, limit, yearFrom, yearTo } = parsedBody.data;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        // Строим фильтр по годам
        const yearFilter =
          yearFrom || yearTo
            ? `AND (
               (a1.year IS NULL OR (a1.year >= ${yearFrom || 1900} AND a1.year <= ${yearTo || 2100}))
               AND (a2.year IS NULL OR (a2.year >= ${yearFrom || 1900} AND a2.year <= ${yearTo || 2100}))
             )`
            : "";

        // Находим пары статей с высокой схожестью, но без прямых цитирований
        const gaps = await pool.query(
          `WITH project_article_ids AS (
            SELECT a.id, a.pmid, a.reference_pmids, a.title_en, a.year
            FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            WHERE pa.project_id = $1 AND pa.status != 'deleted'
          ),
          reference_article_ids AS (
            SELECT DISTINCT ref_article.id, ref_article.pmid, ref_article.reference_pmids, 
                   ref_article.title_en, ref_article.year
            FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            CROSS JOIN LATERAL unnest(COALESCE(a.reference_pmids, ARRAY[]::text[])) AS ref_pmid
            JOIN articles ref_article ON ref_article.pmid = ref_pmid
            WHERE pa.project_id = $1 AND pa.status != 'deleted'
          ),
          cited_by_article_ids AS (
            SELECT DISTINCT cited_article.id, cited_article.pmid, cited_article.reference_pmids,
                   cited_article.title_en, cited_article.year
            FROM articles a
            JOIN project_articles pa ON pa.article_id = a.id
            CROSS JOIN LATERAL unnest(COALESCE(a.cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
            JOIN articles cited_article ON cited_article.pmid = cited_pmid
            WHERE pa.project_id = $1 AND pa.status != 'deleted'
          ),
          all_graph_articles AS (
            SELECT * FROM project_article_ids
            UNION SELECT * FROM reference_article_ids
            UNION SELECT * FROM cited_by_article_ids
          ),
          article_pairs AS (
            SELECT 
              ae1.article_id as article1_id,
              ae2.article_id as article2_id,
              1 - (ae1.embedding <=> ae2.embedding) as similarity
            FROM article_embeddings ae1
            JOIN article_embeddings ae2 ON ae1.article_id < ae2.article_id
            JOIN all_graph_articles ag1 ON ag1.id = ae1.article_id
            JOIN all_graph_articles ag2 ON ag2.id = ae2.article_id
            WHERE 1 - (ae1.embedding <=> ae2.embedding) >= $2
          )
          SELECT 
            ap.article1_id,
            ap.article2_id,
            ap.similarity,
            a1.title_en as article1_title,
            a1.year as article1_year,
            a2.title_en as article2_title,
            a2.year as article2_year
          FROM article_pairs ap
          JOIN articles a1 ON a1.id = ap.article1_id
          JOIN articles a2 ON a2.id = ap.article2_id
          WHERE NOT (
            a1.reference_pmids @> ARRAY[a2.pmid]
            OR a2.reference_pmids @> ARRAY[a1.pmid]
            OR a1.cited_by_pmids @> ARRAY[a2.pmid]
            OR a2.cited_by_pmids @> ARRAY[a1.pmid]
          )
          ${yearFilter}
          ORDER BY ap.similarity DESC
          LIMIT $3`,
          [projectId, threshold, limit],
        );

        const gapRows = gaps.rows as GapAnalysisRow[];
        return {
          gaps: gapRows.map((row) => ({
            article1: {
              id: row.article1_id,
              title: row.article1_title,
              year: row.article1_year,
            },
            article2: {
              id: row.article2_id,
              title: row.article2_title,
              year: row.article2_year,
            },
            similarity: parseFloat(String(row.similarity)),
            reason: generateGapReason(
              parseFloat(String(row.similarity)),
              row.article1_year,
              row.article2_year,
            ),
          })),
          threshold,
          totalGaps: gapRows.length,
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Gap analysis error");
        return reply.code(500).send({
          error: "Failed to perform gap analysis",
          message: "Internal server error",
        });
      }
    },
  );

  /**
   * POST /projects/:projectId/citation-graph/smart-semantic-search
   * Умный семантический поиск с интеграцией кластеров
   */
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof smartSemanticSearchSchema>;
  }>(
    "/projects/:projectId/citation-graph/smart-semantic-search",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const parsedBody = smartSemanticSearchSchema.safeParse(
        request.body || {},
      );
      if (!parsedBody.success) {
        return reply
          .code(400)
          .send({ error: "Invalid request body", details: parsedBody.error });
      }

      const {
        query,
        threshold = 0.6,
        limit = 20,
        clusterId,
        // includeGapAnalysis reserved for future use
      } = parsedBody.data;

      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        const apiKey = await getUserApiKey(userId, "openrouter");
        if (!apiKey) {
          return reply.code(400).send({
            error: "OpenRouter API key required for semantic search",
          });
        }

        // Генерируем embedding запроса
        const queryEmbedding = await generateEmbedding(query, apiKey);

        // Базовый запрос с опциональной фильтрацией по кластеру
        let clusterFilter = "";
        const params: unknown[] = [
          `[${queryEmbedding.join(",")}]`,
          projectId,
          threshold,
          limit,
        ];

        if (clusterId) {
          clusterFilter = `AND sca.cluster_id = $5`;
          params.push(clusterId);
        }

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
            1 - (ae.embedding <=> $1::vector) as similarity,
            sc.id as cluster_id,
            sc.name as cluster_name,
            sc.color as cluster_color,
            CASE WHEN pa.article_id IS NOT NULL THEN pa.status ELSE 'reference' END as status
          FROM article_embeddings ae
          JOIN all_graph_article_ids ag ON ag.id = ae.article_id
          JOIN articles a ON a.id = ae.article_id
          LEFT JOIN semantic_cluster_articles sca
            ON sca.article_id = ae.article_id
           AND EXISTS (
             SELECT 1 FROM semantic_clusters scx
             WHERE scx.id = sca.cluster_id AND scx.project_id = $2
           )
          LEFT JOIN semantic_clusters sc ON sc.id = sca.cluster_id
          LEFT JOIN project_articles pa ON pa.article_id = a.id AND pa.project_id = $2
          WHERE 1 - (ae.embedding <=> $1::vector) >= $3
          ${clusterFilter}
          ORDER BY similarity DESC
          LIMIT $4`,
          params,
        );

        // Группируем результаты по кластерам
        const resultsByCluster: Record<string, ClusterSearchGroup> = {};
        const unclusteredResults: SmartSearchArticle[] = [];
        const resultRows = results.rows as SmartSearchRow[];

        for (const row of resultRows) {
          const article: SmartSearchArticle = {
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
            similarity: parseFloat(String(row.similarity)),
            clusterId: row.cluster_id,
            clusterName: row.cluster_name,
            clusterColor: row.cluster_color,
          };

          if (row.cluster_id) {
            if (!resultsByCluster[row.cluster_id]) {
              resultsByCluster[row.cluster_id] = {
                cluster: {
                  id: row.cluster_id,
                  name: row.cluster_name,
                  color: row.cluster_color,
                },
                articles: [],
              };
            }
            resultsByCluster[row.cluster_id].articles.push(article);
          } else {
            unclusteredResults.push(article);
          }
        }

        return {
          query,
          results: resultRows.map((row) => ({
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
            similarity: parseFloat(String(row.similarity)),
            clusterId: row.cluster_id,
            clusterName: row.cluster_name,
            clusterColor: row.cluster_color,
          })),
          resultsByCluster: Object.values(resultsByCluster),
          unclusteredResults,
          totalFound: resultRows.length,
          threshold,
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Smart semantic search error");
        return reply.code(500).send({
          error: "Failed to perform smart semantic search",
          message: "Internal server error",
        });
      }
    },
  );

  /**
   * DELETE /projects/:projectId/citation-graph/semantic-clusters
   * Удалить все кластеры проекта
   */
  fastify.delete<{
    Params: { projectId: string };
  }>(
    "/projects/:projectId/citation-graph/semantic-clusters",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const access = await checkProjectAccessPool(projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      try {
        await pool.query(
          `DELETE FROM semantic_clusters WHERE project_id = $1`,
          [projectId],
        );

        return { success: true };
      } catch (error) {
        fastify.log.error({ err: error }, "Delete semantic clusters error");
        return reply.code(500).send({
          error: "Failed to delete semantic clusters",
          message: "Internal server error",
        });
      }
    },
  );

  done();
};

// === Helper Functions ===

function parseEmbedding(embeddingStr: string): number[] {
  // Формат: "[0.1,0.2,...]"
  const cleaned = embeddingStr.replace(/\[|\]/g, "");
  return cleaned.split(",").map((s) => parseFloat(s.trim()));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

interface ArticleWithEmbedding {
  id: string;
  title: string;
  abstract: string;
  embedding: number[];
}

interface Cluster {
  centroid: number[];
  members: ArticleWithEmbedding[];
  avgSimilarity: number;
}

function kMeansClustering(
  articles: ArticleWithEmbedding[],
  k: number,
  minSimilarity: number,
  maxIterations: number = 50,
): Cluster[] {
  if (articles.length === 0 || k <= 0) return [];

  // Инициализируем центроиды через k-means++
  const centroids: number[][] = [];
  const usedIndices = new Set<number>();

  // Первый центроид - случайный
  const firstIndex = Math.floor(Math.random() * articles.length);
  centroids.push([...articles[firstIndex].embedding]);
  usedIndices.add(firstIndex);

  // Остальные центроиды выбираем с вероятностью пропорционально расстоянию
  while (centroids.length < k) {
    const distances = articles.map((article, idx) => {
      if (usedIndices.has(idx)) return 0;
      return Math.min(
        ...centroids.map((c) => 1 - cosineSimilarity(article.embedding, c)),
      );
    });

    const totalDist = distances.reduce((a, b) => a + b, 0);
    if (totalDist === 0) break;

    let random = Math.random() * totalDist;
    for (let i = 0; i < distances.length; i++) {
      random -= distances[i];
      if (random <= 0 && !usedIndices.has(i)) {
        centroids.push([...articles[i].embedding]);
        usedIndices.add(i);
        break;
      }
    }
  }

  // K-means iterations
  let assignments: number[] = new Array(articles.length).fill(-1);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign articles to nearest centroid
    const newAssignments = articles.map((article) => {
      let bestCluster = 0;
      let bestSim = -Infinity;

      for (let c = 0; c < centroids.length; c++) {
        const sim = cosineSimilarity(article.embedding, centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = c;
        }
      }

      return bestSim >= minSimilarity ? bestCluster : -1;
    });

    // Check for convergence
    if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) {
      break;
    }
    assignments = newAssignments;

    // Update centroids
    for (let c = 0; c < centroids.length; c++) {
      const members = articles.filter((_, i) => assignments[i] === c);
      if (members.length === 0) continue;

      const newCentroid = new Array(centroids[c].length).fill(0);
      for (const member of members) {
        for (let i = 0; i < member.embedding.length; i++) {
          newCentroid[i] += member.embedding[i];
        }
      }
      for (let i = 0; i < newCentroid.length; i++) {
        newCentroid[i] /= members.length;
      }
      centroids[c] = newCentroid;
    }
  }

  // Build clusters
  const clusters: Cluster[] = [];
  for (let c = 0; c < centroids.length; c++) {
    const members = articles.filter((_, i) => assignments[i] === c);
    if (members.length === 0) continue;

    // Calculate average internal similarity
    let totalSim = 0;
    let pairCount = 0;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        totalSim += cosineSimilarity(
          members[i].embedding,
          members[j].embedding,
        );
        pairCount++;
      }
    }

    clusters.push({
      centroid: centroids[c],
      members,
      avgSimilarity: pairCount > 0 ? totalSim / pairCount : 0,
    });
  }

  return clusters;
}

function findCentralArticle(
  members: ArticleWithEmbedding[],
  _allArticles?: ArticleWithEmbedding[],
): ArticleWithEmbedding | null {
  if (members.length === 0) return null;

  let bestArticle: ArticleWithEmbedding | null = null;
  let bestScore = -Infinity;

  for (const member of members) {
    // Score = sum of similarities to other cluster members
    let score = 0;
    for (const other of members) {
      if (other.id !== member.id) {
        score += cosineSimilarity(member.embedding, other.embedding);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestArticle = member;
    }
  }

  return bestArticle;
}

function extractKeywords(titles: string[]): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "to",
    "in",
    "for",
    "with",
    "on",
    "at",
    "by",
    "from",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "that",
    "this",
    "these",
    "those",
    "it",
    "its",
    "study",
    "analysis",
    "review",
    "patients",
    "results",
    "effect",
    "effects",
    "using",
    "based",
    "new",
  ]);

  const wordCounts: Record<string, number> = {};

  for (const title of titles) {
    const words = title
      .toLowerCase()
      .replace(/[^a-zA-Z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

async function generateClusterName(
  titles: string[],
  apiKey: string,
): Promise<{ en: string; ru: string }> {
  const prompt = `Based on these scientific article titles, generate a short (2-4 words) descriptive name for this cluster of related research:

Titles:
${titles.slice(0, 10).join("\n")}

Respond in JSON format:
{"en": "English Name", "ru": "Название по-русски"}

Focus on the main topic/theme that connects these articles.`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://lilitomukib.beget.app",
        "X-Title": "MDsystem",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to generate cluster name: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content || "";

  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback
  }

  return { en: "Research Cluster", ru: "Исследовательский кластер" };
}

function generateGapReason(
  similarity: number,
  year1: number | null,
  year2: number | null,
): string {
  const simPercent = Math.round(similarity * 100);

  if (year1 && year2) {
    const yearDiff = Math.abs(year1 - year2);
    if (yearDiff <= 2) {
      return `Высокая схожесть (${simPercent}%) между современными работами - возможно, авторы не знали о работе друг друга`;
    } else if (yearDiff <= 5) {
      return `Схожие темы (${simPercent}%), небольшая временная разница - проверьте цитирования`;
    } else {
      return `Тематическая связь (${simPercent}%) между работами разных периодов`;
    }
  }

  return `Семантическая схожесть ${simPercent}% без прямого цитирования`;
}

async function generateEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://lilitomukib.beget.app",
      "X-Title": "MDsystem",
    },
    body: JSON.stringify({
      input: text.trim().slice(0, 8000),
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
