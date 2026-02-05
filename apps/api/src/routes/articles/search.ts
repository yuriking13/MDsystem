/**
 * Article Search Routes
 *
 * Handles article search across PubMed, DOAJ, and Wiley sources.
 * Extracted from full.ts for better maintainability.
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../../pg.js";
import {
  pubmedFetchAll,
  type PubMedArticle,
  type PubMedFilters,
} from "../../lib/pubmed.js";
import { doajFetchAll, type DOAJArticle } from "../../lib/doaj.js";
import { wileyFetchAll, type WileyArticle } from "../../lib/wiley.js";
import { translateArticlesBatchOptimized } from "../../lib/translate.js";
import { enrichArticlesByDOIBatch } from "../../lib/crossref.js";
import { extractStats, hasAnyStats } from "../../lib/stats.js";
import {
  cacheGet,
  cacheSet,
  invalidateArticles,
  CACHE_KEYS,
  TTL,
} from "../../lib/redis.js";
import { getUserId } from "../../utils/auth-helpers.js";
import { createLogger } from "../../utils/logger.js";
import {
  SearchBodySchema,
  ProjectIdSchema,
  PUBMED_SEARCH_FIELDS,
  SEARCH_SOURCES,
} from "./types.js";
import { checkProjectAccess, checkArticleDuplicate } from "./helpers.js";

const log = createLogger("articles-search");

/**
 * Search plugin - handles article search from external sources
 */
const searchPlugin: FastifyPluginAsync = async (fastify) => {
  // POST /projects/:id/search - Search for articles
  fastify.post(
    "/projects/:id/search",
    {
      schema: {
        description: "Search for articles in PubMed, DOAJ, Wiley",
        tags: ["articles"],
        params: ProjectIdSchema,
        body: SearchBodySchema,
      },
    },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id: projectId } = ProjectIdSchema.parse(request.params);
      const body = SearchBodySchema.parse(request.body);

      // Check project access
      const access = await checkProjectAccess(projectId, userId, true);
      if (!access.ok) {
        return reply.status(403).send({ error: "Нет доступа к проекту" });
      }

      const { query, sources, filters, maxResults } = body;
      const results: Array<{
        source: string;
        articles: (PubMedArticle | DOAJArticle | WileyArticle)[];
        total: number;
      }> = [];

      // Search each selected source in parallel
      const searchPromises = sources.map(async (source) => {
        try {
          switch (source) {
            case "pubmed": {
              const pubmedFilters: PubMedFilters = {
                yearFrom: filters?.yearFrom,
                yearTo: filters?.yearTo,
                freeFullTextOnly: filters?.freeFullTextOnly,
                fullTextOnly: filters?.fullTextOnly,
                publicationTypes: filters?.publicationTypes,
                publicationTypesLogic: filters?.publicationTypesLogic,
                searchField:
                  filters?.searchField ||
                  ("Title/Abstract" as (typeof PUBMED_SEARCH_FIELDS)[number]),
              };

              const pubmedResults = await pubmedFetchAll({
                query,
                filters: pubmedFilters,
                max: maxResults,
              });
              return {
                source: "pubmed",
                articles: pubmedResults.articles,
                total: pubmedResults.total,
              };
            }
            case "doaj": {
              const doajResults = await doajFetchAll({
                query,
                yearFrom: filters?.yearFrom,
                yearTo: filters?.yearTo,
                max: maxResults,
              });
              return {
                source: "doaj",
                articles: doajResults.articles,
                total: doajResults.total,
              };
            }
            case "wiley": {
              const wileyResults = await wileyFetchAll({
                query,
                yearFrom: filters?.yearFrom,
                yearTo: filters?.yearTo,
                max: maxResults,
              });
              return {
                source: "wiley",
                articles: wileyResults.articles,
                total: wileyResults.total,
              };
            }
            default:
              return { source, articles: [], total: 0 };
          }
        } catch (err) {
          log.error(`Search error for source ${source}`, err as Error);
          return { source, articles: [], total: 0, error: String(err) };
        }
      });

      const searchResults = await Promise.all(searchPromises);
      results.push(...searchResults);

      // Aggregate all articles
      type SearchArticle = PubMedArticle | DOAJArticle | WileyArticle;
      let allArticles: SearchArticle[] = [];
      let totalFound = 0;

      for (const result of results) {
        allArticles = allArticles.concat(result.articles);
        totalFound += result.total;
      }

      // Deduplicate by PMID/DOI
      const seen = new Set<string>();
      const uniqueArticles: SearchArticle[] = [];

      for (const article of allArticles) {
        const key =
          article.pmid || article.doi || `${article.title}-${article.year}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueArticles.push(article);
        }
      }

      // Process post-search options
      let processedArticles = uniqueArticles;

      // Optional: Translate
      if (filters?.translate && uniqueArticles.length > 0) {
        const openrouterKey = await getOpenRouterKey(projectId);
        if (openrouterKey) {
          const translated = await translateArticlesBatchOptimized(
            openrouterKey,
            uniqueArticles.map((a) => ({
              id: a.pmid || a.doi || "",
              title: a.title || "",
              abstract: a.abstract || "",
            })),
          );
          // Merge translations back
          for (const article of processedArticles) {
            const key = article.pmid || article.doi || "";
            const tr = translated.results.get(key);
            if (tr) {
              (article as any).title_ru = tr.title_ru;
              (article as any).abstract_ru = tr.abstract_ru;
            }
          }
        }
      }

      // Optional: Detect stats
      if (filters?.detectStats && uniqueArticles.length > 0) {
        for (const article of processedArticles) {
          if (article.abstract) {
            const stats = extractStats(article.abstract);
            if (hasAnyStats(stats)) {
              (article as any).stats = stats;
              (article as any).hasStats = true;
            }
          }
        }
      }

      return {
        results,
        totalFound,
        uniqueArticles: processedArticles.length,
        articles: processedArticles,
      };
    },
  );
};

// Helper to get OpenRouter key for a project
async function getOpenRouterKey(projectId: string): Promise<string | null> {
  const res = await pool.query(
    `SELECT openrouter_key FROM projects WHERE id = $1`,
    [projectId],
  );
  return res.rows[0]?.openrouter_key || null;
}

export default searchPlugin;
