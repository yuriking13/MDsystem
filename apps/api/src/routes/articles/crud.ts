/**
 * Article CRUD Routes
 *
 * Handles basic article operations: list, update status, delete.
 * Extracted from full.ts for better maintainability.
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../../pg.js";
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
  ProjectIdSchema,
  ArticleIdSchema,
  ArticleStatusSchema,
  BatchUpdateStatusSchema,
} from "./types.js";
import { checkProjectAccess, hasColumn } from "./helpers.js";

const log = createLogger("articles-crud");

/**
 * CRUD plugin - handles basic article operations
 */
const crudPlugin: FastifyPluginAsync = async (fastify) => {
  // GET /projects/:id/articles - List all articles in a project
  fastify.get(
    "/projects/:id/articles",
    {
      schema: {
        description: "Get all articles in a project",
        tags: ["articles"],
        params: ProjectIdSchema,
        querystring: z.object({
          status: z
            .enum(["candidate", "selected", "excluded", "deleted", "all"])
            .optional(),
          page: z.coerce.number().int().min(1).optional().default(1),
          limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(500)
            .optional()
            .default(100),
        }),
      },
    },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id: projectId } = ProjectIdSchema.parse(request.params);
      const queryParams = request.query as {
        status?: string;
        page?: number;
        limit?: number;
      };
      const status = queryParams.status || "all";
      const page = queryParams.page || 1;
      const limit = queryParams.limit || 100;

      // Check project access
      const access = await checkProjectAccess(projectId, userId);
      if (!access.ok) {
        return reply.status(403).send({ error: "Нет доступа к проекту" });
      }

      // Try cache first
      const cacheKey = CACHE_KEYS.articles(projectId, { status, page, limit });
      const cached = await cacheGet<{ articles: unknown[]; total: number }>(
        cacheKey,
      );
      if (cached) {
        return cached;
      }

      // Build query
      let query = `
        SELECT 
          a.id, a.pmid, a.doi, a.title_en, a.title_ru, a.authors,
          a.journal, a.year, a.volume, a.issue, a.pages,
          a.abstract_en, a.abstract_ru, a.publication_type,
          a.source, a.keywords, a.mesh_terms, a.stats,
          a.citation_count, a.has_full_text, a.has_free_full_text,
          pa.status, pa.notes, pa.source_query, pa.created_at
        FROM articles a
        JOIN project_articles pa ON pa.article_id = a.id
        WHERE pa.project_id = $1
      `;
      const params: (string | number)[] = [projectId];

      if (status !== "all") {
        query += ` AND pa.status = $2`;
        params.push(status);
      } else {
        query += ` AND pa.status != 'deleted'`;
      }

      // Count total
      const countQuery = query.replace(
        /SELECT[\s\S]*?FROM/,
        "SELECT COUNT(*) FROM",
      );
      const countRes = await pool.query(countQuery, params);
      const total = parseInt(countRes.rows[0].count, 10);

      // Add pagination
      const offset = (page - 1) * limit;
      query += ` ORDER BY pa.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const res = await pool.query(query, params);

      const result = {
        articles: res.rows.map((row) => ({
          id: row.id,
          pmid: row.pmid,
          doi: row.doi,
          title: row.title_en,
          titleRu: row.title_ru,
          authors: row.authors || [],
          journal: row.journal,
          year: row.year,
          volume: row.volume,
          issue: row.issue,
          pages: row.pages,
          abstract: row.abstract_en,
          abstractRu: row.abstract_ru,
          publicationType: row.publication_type,
          source: row.source,
          keywords: row.keywords || [],
          meshTerms: row.mesh_terms || [],
          stats: row.stats,
          citationCount: row.citation_count,
          hasFullText: row.has_full_text,
          hasFreeFullText: row.has_free_full_text,
          status: row.status,
          notes: row.notes,
          sourceQuery: row.source_query,
          createdAt: row.created_at,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      // Cache the result
      await cacheSet(cacheKey, result, TTL.ARTICLES);

      return result;
    },
  );

  // PATCH /projects/:id/articles/:articleId - Update article status
  fastify.patch(
    "/projects/:id/articles/:articleId",
    {
      schema: {
        description: "Update article status",
        tags: ["articles"],
        params: ArticleIdSchema,
        body: ArticleStatusSchema,
      },
    },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id: projectId, articleId } = ArticleIdSchema.parse(
        request.params,
      );
      const { status, notes } = ArticleStatusSchema.parse(request.body);

      // Check project access
      const access = await checkProjectAccess(projectId, userId, true);
      if (!access.ok) {
        return reply
          .status(403)
          .send({ error: "Нет доступа к редактированию проекта" });
      }

      // Update status
      await pool.query(
        `UPDATE project_articles SET status = $1, notes = COALESCE($2, notes)
         WHERE project_id = $3 AND article_id = $4`,
        [status, notes, projectId, articleId],
      );

      // Invalidate cache
      await invalidateArticles(projectId);

      return { success: true, articleId, status };
    },
  );

  // DELETE /projects/:id/articles/:articleId - Soft delete article
  fastify.delete(
    "/projects/:id/articles/:articleId",
    {
      schema: {
        description: "Delete article from project (soft delete)",
        tags: ["articles"],
        params: ArticleIdSchema,
      },
    },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id: projectId, articleId } = ArticleIdSchema.parse(
        request.params,
      );

      // Check project access
      const access = await checkProjectAccess(projectId, userId, true);
      if (!access.ok) {
        return reply
          .status(403)
          .send({ error: "Нет доступа к редактированию проекта" });
      }

      // Soft delete (change status to deleted)
      await pool.query(
        `UPDATE project_articles SET status = 'deleted' WHERE project_id = $1 AND article_id = $2`,
        [projectId, articleId],
      );

      // Invalidate cache
      await invalidateArticles(projectId);

      return { success: true };
    },
  );

  // POST /projects/:id/articles/bulk-status - Bulk update article statuses
  fastify.post(
    "/projects/:id/articles/bulk-status",
    {
      schema: {
        description: "Bulk update article statuses",
        tags: ["articles"],
        params: ProjectIdSchema,
        body: BatchUpdateStatusSchema,
      },
    },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id: projectId } = ProjectIdSchema.parse(request.params);
      const { articleIds, status } = BatchUpdateStatusSchema.parse(
        request.body,
      );

      // Check project access
      const access = await checkProjectAccess(projectId, userId, true);
      if (!access.ok) {
        return reply
          .status(403)
          .send({ error: "Нет доступа к редактированию проекта" });
      }

      // Bulk update
      await pool.query(
        `UPDATE project_articles SET status = $1 WHERE project_id = $2 AND article_id = ANY($3)`,
        [status, projectId, articleIds],
      );

      // Invalidate cache
      await invalidateArticles(projectId);

      return { success: true, updated: articleIds.length };
    },
  );
};

export default crudPlugin;
