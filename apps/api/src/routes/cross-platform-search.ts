/**
 * Cross-Platform Search API Routes
 * Поиск научных статей через PubMed, Crossref, arXiv с кэшированием и объединением результатов
 */

import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { getUserId } from "../utils/auth-helpers.js";
import {
  CrossPlatformSearchService,
  type SearchProvider,
  type SearchQuery,
} from "../services/CrossPlatformSearchService.js";

const searchQuerySchema = z.object({
  query: z.string().min(1).max(500, "Query too long"),
  providers: z
    .array(z.enum(["pubmed", "crossref", "arxiv", "semantic"]))
    .min(1, "At least one provider required"),
  maxResults: z.number().int().min(1).max(100).default(20),
  yearFrom: z.number().int().min(1800).max(2030).optional(),
  yearTo: z.number().int().min(1800).max(2030).optional(),
  language: z.enum(["en", "ru", "any"]).default("any"),
  sortBy: z.enum(["relevance", "date", "citations"]).default("relevance"),
  projectId: z.string().optional(), // For semantic search in project context
});

// Commented out for future use
// const searchProviderStatsSchema = z.object({
//   days: z.number().int().min(1).max(90).default(30),
// });

export const crossPlatformSearchRoutes: FastifyPluginCallback = (
  fastify,
  _opts,
  done,
) => {
  const searchService = new CrossPlatformSearchService();

  /**
   * POST /search/cross-platform
   * Кросс-платформенный поиск научных статей
   */
  fastify.post<{
    Body: z.infer<typeof searchQuerySchema>;
  }>(
    "/search/cross-platform",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsedBody = searchQuerySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({
          error: "Invalid search parameters",
          details: parsedBody.error.errors,
        });
      }

      const userId = getUserId(request);
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const searchQuery: SearchQuery = parsedBody.data;

      // Validate year range
      if (
        searchQuery.yearFrom &&
        searchQuery.yearTo &&
        searchQuery.yearFrom > searchQuery.yearTo
      ) {
        return reply.code(400).send({
          error: "Invalid year range: yearFrom cannot be greater than yearTo",
        });
      }

      try {
        const startTime = Date.now();
        const searchResult = await searchService.search(searchQuery);
        const searchTimeMs = Date.now() - startTime;

        // Log search for analytics (async, don't wait)
        setImmediate(async () => {
          try {
            await pool.query(`SELECT log_user_search($1, $2, $3, $4, $5)`, [
              userId,
              searchQuery.query,
              JSON.stringify(searchQuery.providers),
              searchResult.totalFound,
              searchTimeMs,
            ]);
          } catch (error) {
            fastify.log.warn({ err: error }, "Failed to log search");
          }
        });

        return {
          success: true,
          data: searchResult,
        };
      } catch (error) {
        fastify.log.error(
          { err: error, query: searchQuery },
          "Cross-platform search failed",
        );
        return reply.code(500).send({
          error: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  /**
   * GET /search/providers
   * Получить список доступных провайдеров поиска
   */
  fastify.get(
    "/search/providers",
    { preHandler: [fastify.authenticate] },
    async (_request, _reply) => {
      return {
        providers: [
          {
            id: "pubmed" as SearchProvider,
            name: "PubMed",
            description: "National Library of Medicine biomedical database",
            url: "https://pubmed.ncbi.nlm.nih.gov/",
            coverage: "Biomedical and life sciences",
            free: true,
            maxResults: 200,
          },
          {
            id: "crossref" as SearchProvider,
            name: "Crossref",
            description: "Scholarly literature metadata registry",
            url: "https://www.crossref.org/",
            coverage: "Multidisciplinary scholarly publications",
            free: true,
            maxResults: 200,
          },
          {
            id: "arxiv" as SearchProvider,
            name: "arXiv",
            description:
              "Preprint repository for physics, mathematics, computer science",
            url: "https://arxiv.org/",
            coverage: "Physics, Mathematics, Computer Science, Biology",
            free: true,
            maxResults: 200,
          },
          {
            id: "semantic" as SearchProvider,
            name: "Semantic Search",
            description:
              "Search in your existing article database using semantic similarity",
            url: "",
            coverage: "Your imported articles",
            free: true,
            maxResults: 100,
          },
        ],
        totalProviders: 4,
        recommendations: [
          {
            field: "biomedical",
            providers: ["pubmed", "crossref"],
            description:
              "For biomedical research, start with PubMed and supplement with Crossref",
          },
          {
            field: "physics_math",
            providers: ["arxiv", "crossref"],
            description:
              "For physics and mathematics, combine arXiv preprints with published works from Crossref",
          },
          {
            field: "multidisciplinary",
            providers: ["crossref", "semantic", "pubmed"],
            description:
              "For broad research, use Crossref as primary with semantic search in your existing collection",
          },
        ],
      };
    },
  );

  /**
   * GET /search/cache-stats
   * Статистика кэша поиска
   */
  fastify.get(
    "/search/cache-stats",
    { preHandler: [fastify.authenticate] },
    async (_request, reply) => {
      const userId = getUserId(_request);
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        // Общая статистика кэша
        const cacheStats = await pool.query(`
          SELECT 
            COUNT(*) as total_cached_queries,
            AVG(total_found) as avg_results_per_query,
            MIN(created_at) as oldest_cache_entry,
            MAX(created_at) as newest_cache_entry
          FROM search_cache
        `);

        // Статистика по провайдерам
        const providerStats = await pool.query(`
          SELECT 
            provider_name,
            COUNT(*) as usage_count,
            AVG(results_count) as avg_results
          FROM (
            SELECT 
              jsonb_array_elements_text(providers) as provider_name,
              total_found as results_count
            FROM search_cache
          ) provider_usage
          GROUP BY provider_name
          ORDER BY usage_count DESC
        `);

        // Статистика пользователя за последние 30 дней
        const userStats = await pool.query(
          `
          SELECT 
            COUNT(*) as user_searches_count,
            AVG(results_count) as avg_results_found,
            AVG(search_time_ms) as avg_search_time_ms,
            COUNT(DISTINCT DATE_TRUNC('day', created_at)) as active_search_days
          FROM user_search_history
          WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
        `,
          [userId],
        );

        return {
          cache: {
            totalQueries: parseInt(
              cacheStats.rows[0]?.total_cached_queries || "0",
            ),
            avgResultsPerQuery: parseFloat(
              cacheStats.rows[0]?.avg_results_per_query || "0",
            ),
            oldestEntry: cacheStats.rows[0]?.oldest_cache_entry,
            newestEntry: cacheStats.rows[0]?.newest_cache_entry,
          },
          providers: providerStats.rows.map((row) => ({
            name: row.provider_name,
            usageCount: parseInt(row.usage_count),
            avgResults: parseFloat(row.avg_results || "0"),
          })),
          userStats: {
            searchesLast30Days: parseInt(
              userStats.rows[0]?.user_searches_count || "0",
            ),
            avgResultsFound: parseFloat(
              userStats.rows[0]?.avg_results_found || "0",
            ),
            avgSearchTimeMs: parseFloat(
              userStats.rows[0]?.avg_search_time_ms || "0",
            ),
            activeSearchDays: parseInt(
              userStats.rows[0]?.active_search_days || "0",
            ),
          },
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Cache stats error");
        return reply.code(500).send({
          error: "Failed to get cache statistics",
          message: "Internal server error",
        });
      }
    },
  );

  /**
   * DELETE /search/cache
   * Очистить кэш поиска (админская функция)
   */
  fastify.delete(
    "/search/cache",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      // Проверяем права администратора
      const userCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId],
      );

      if (userCheck.rows[0]?.role !== "admin") {
        return reply.code(403).send({ error: "Admin access required" });
      }

      try {
        const result = await pool.query(
          "DELETE FROM search_cache RETURNING COUNT(*)",
        );
        const deletedCount = result.rowCount || 0;

        fastify.log.info(
          { deletedCount, adminUserId: userId },
          "Search cache cleared by admin",
        );

        return {
          success: true,
          message: "Search cache cleared",
          deletedEntries: deletedCount,
        };
      } catch (error) {
        fastify.log.error({ err: error }, "Cache clear error");
        return reply.code(500).send({
          error: "Failed to clear cache",
          message: "Internal server error",
        });
      }
    },
  );

  /**
   * POST /search/import-results
   * Импортировать результаты поиска в проект как кандидаты
   */
  fastify.post<{
    Body: {
      projectId: string;
      searchResults: Array<{
        id: string;
        provider: SearchProvider;
        title: string;
        authors?: string[];
        abstract?: string;
        doi?: string;
        pmid?: string;
        arxivId?: string;
        journal?: string;
        year?: number;
        url?: string;
      }>;
    };
  }>(
    "/search/import-results",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId, searchResults } = request.body;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      if (
        !projectId ||
        !Array.isArray(searchResults) ||
        searchResults.length === 0
      ) {
        return reply.code(400).send({
          error: "Invalid request: projectId and searchResults array required",
        });
      }

      if (searchResults.length > 100) {
        return reply.code(400).send({
          error:
            "Too many results: maximum 100 articles can be imported at once",
        });
      }

      // Проверяем доступ к проекту
      const projectCheck = await pool.query(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        [projectId, userId],
      );

      if (projectCheck.rows.length === 0) {
        return reply
          .code(403)
          .send({ error: "Project not found or access denied" });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const importedArticles = [];
        const skippedArticles = [];

        for (const result of searchResults) {
          // Проверяем, существует ли статья уже
          let existingArticle = null;
          if (result.doi) {
            const doiCheck = await client.query(
              "SELECT id FROM articles WHERE doi = $1",
              [result.doi],
            );
            existingArticle = doiCheck.rows[0];
          } else if (result.pmid) {
            const pmidCheck = await client.query(
              "SELECT id FROM articles WHERE pmid = $1",
              [result.pmid],
            );
            existingArticle = pmidCheck.rows[0];
          }

          let articleId: string;

          if (existingArticle) {
            articleId = existingArticle.id;
          } else {
            // Создаем новую статью
            const insertResult = await client.query(
              `
              INSERT INTO articles (
                title_en, title_ru, abstract_en, authors, journal, year, 
                doi, pmid, url, source, import_source
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING id
            `,
              [
                result.title,
                null, // title_ru
                result.abstract,
                result.authors || [],
                result.journal,
                result.year,
                result.doi,
                result.pmid,
                result.url,
                result.provider,
                "cross_platform_search",
              ],
            );
            articleId = insertResult.rows[0].id;
          }

          // Добавляем в проект как кандидата (если еще не добавлено)
          const projectArticleCheck = await client.query(
            "SELECT status FROM project_articles WHERE project_id = $1 AND article_id = $2",
            [projectId, articleId],
          );

          if (projectArticleCheck.rows.length === 0) {
            await client.query(
              `
              INSERT INTO project_articles (project_id, article_id, status, added_at)
              VALUES ($1, $2, 'candidate', NOW())
            `,
              [projectId, articleId],
            );

            importedArticles.push({
              id: articleId,
              title: result.title,
              provider: result.provider,
              status: "imported",
            });
          } else {
            skippedArticles.push({
              id: articleId,
              title: result.title,
              provider: result.provider,
              status: projectArticleCheck.rows[0].status,
              reason: "already_in_project",
            });
          }
        }

        await client.query("COMMIT");

        fastify.log.info(
          {
            userId,
            projectId,
            imported: importedArticles.length,
            skipped: skippedArticles.length,
          },
          "Search results imported",
        );

        return {
          success: true,
          imported: importedArticles,
          skipped: skippedArticles,
          summary: {
            totalProcessed: searchResults.length,
            imported: importedArticles.length,
            skipped: skippedArticles.length,
          },
        };
      } catch (error) {
        await client.query("ROLLBACK");
        fastify.log.error({ err: error, projectId, userId }, "Import error");
        return reply.code(500).send({
          error: "Failed to import search results",
          message: "Internal server error",
        });
      } finally {
        client.release();
      }
    },
  );

  done();
};
