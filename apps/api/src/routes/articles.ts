import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { pubmedFetchAll, type PubMedArticle, type PubMedFilters } from "../lib/pubmed.js";
import { extractStats, hasAnyStats, calculateStatsQuality } from "../lib/stats.js";
import { translateArticlesBatchOptimized, type TranslationResult } from "../lib/translate.js";

// Схемы валидации
const SearchBodySchema = z.object({
  query: z.string().min(1).max(1000),
  filters: z.object({
    yearFrom: z.number().int().min(1900).max(2100).optional(),
    yearTo: z.number().int().min(1900).max(2100).optional(),
    freeFullTextOnly: z.boolean().optional(),
    fullTextOnly: z.boolean().optional(),
    publicationTypes: z.array(z.string()).optional(),
    publicationTypesLogic: z.enum(["or", "and"]).optional(),
    translate: z.boolean().optional(),
  }).optional(),
  maxResults: z.number().int().min(1).max(1000).default(100),
});

const ArticleStatusSchema = z.object({
  status: z.enum(["candidate", "selected", "excluded"]),
  notes: z.string().max(5000).optional(),
});

const ProjectIdSchema = z.object({
  id: z.string().uuid(),
});

const ArticleIdSchema = z.object({
  id: z.string().uuid(),
  articleId: z.string().uuid(),
});

// Получить API ключ пользователя для провайдера
async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  const res = await pool.query(
    `SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );
  if (res.rowCount === 0) return null;
  
  // Для PubMed ключ не шифруется критично, просто возвращаем
  // В реальности нужно расшифровать, но пока упрощаем
  const encrypted = res.rows[0].encrypted_key;
  
  // Расшифровка (импортируем функцию)
  try {
    const { decryptApiKey } = await import("../utils/apiKeyCrypto.js");
    return decryptApiKey(encrypted);
  } catch {
    return null;
  }
}

// Проверка доступа к проекту
async function checkProjectAccess(
  projectId: string, 
  userId: string, 
  requireEdit = false
): Promise<{ ok: boolean; role?: string }> {
  const res = await pool.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  if (res.rowCount === 0) return { ok: false };
  
  const role = res.rows[0].role;
  if (requireEdit && role === "viewer") return { ok: false, role };
  
  return { ok: true, role };
}

// Найти или создать статью по DOI/PMID
async function findOrCreateArticle(article: PubMedArticle, publicationTypes?: string[]): Promise<string> {
  // Сначала ищем по PMID
  if (article.pmid) {
    const existing = await pool.query(
      `SELECT id FROM articles WHERE pmid = $1`,
      [article.pmid]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return existing.rows[0].id;
    }
  }
  
  // Потом по DOI
  if (article.doi) {
    const existing = await pool.query(
      `SELECT id FROM articles WHERE doi = $1`,
      [article.doi.toLowerCase()]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return existing.rows[0].id;
    }
  }
  
  // Извлекаем статистику
  const stats = extractStats(article.abstract);
  const hasStats = hasAnyStats(stats);
  const statsQuality = hasStats ? calculateStatsQuality(stats) : 0;
  
  // Создаём новую статью
  const authors = article.authors 
    ? article.authors.split(",").map(a => a.trim()).filter(Boolean)
    : null;
  
  // Типы публикации из статьи или переданные
  const pubTypes = publicationTypes || article.studyTypes || [];
  
  const res = await pool.query(
    `INSERT INTO articles (
      doi, pmid, title_en, abstract_en, authors, year, journal, url, source, 
      has_stats, stats_json, stats_quality, publication_types, raw_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id`,
    [
      article.doi?.toLowerCase() || null,
      article.pmid || null,
      article.title,
      article.abstract || null,
      authors,
      article.year || null,
      article.journal || null,
      article.url,
      "pubmed",
      hasStats,
      hasStats ? JSON.stringify(stats) : null,
      statsQuality,
      pubTypes.length > 0 ? pubTypes : null,
      JSON.stringify(article),
    ]
  );
  
  return res.rows[0].id;
}

// Добавить статью в проект (с дедупликацией)
async function addArticleToProject(
  projectId: string, 
  articleId: string, 
  userId: string
): Promise<boolean> {
  // Проверяем, есть ли уже связь
  const existing = await pool.query(
    `SELECT 1 FROM project_articles WHERE project_id = $1 AND article_id = $2`,
    [projectId, articleId]
  );
  
  if ((existing.rowCount ?? 0) > 0) {
    return false; // Уже добавлена
  }
  
  await pool.query(
    `INSERT INTO project_articles (project_id, article_id, status, added_by)
     VALUES ($1, $2, 'candidate', $3)`,
    [projectId, articleId, userId]
  );
  
  return true;
}

const plugin: FastifyPluginAsync = async (fastify) => {
  // POST /api/projects/:id/search - поиск статей в PubMed
  fastify.post(
    "/projects/:id/search",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      const bodyP = SearchBodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body", details: bodyP.error.message });
      }
      
      // Проверка доступа (нужен edit)
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access to project" });
      }
      
      // Получить API ключ пользователя
      const apiKey = await getUserApiKey(userId, "pubmed");
      
      // Формируем фильтры PubMed
      const filters: PubMedFilters = {};
      if (bodyP.data.filters?.yearFrom) {
        filters.publishedFrom = `${bodyP.data.filters.yearFrom}/01/01`;
      }
      if (bodyP.data.filters?.yearTo) {
        filters.publishedTo = `${bodyP.data.filters.yearTo}/12/31`;
      }
      if (bodyP.data.filters?.freeFullTextOnly) {
        filters.freeFullTextOnly = true;
      }
      if (bodyP.data.filters?.fullTextOnly) {
        filters.fullTextOnly = true;
      }
      if (bodyP.data.filters?.publicationTypes?.length) {
        filters.publicationTypes = bodyP.data.filters.publicationTypes;
        filters.publicationTypesLogic = bodyP.data.filters.publicationTypesLogic || "or";
      }
      
      // Опция перевода
      const shouldTranslate = bodyP.data.filters?.translate === true;
      
      // Выполняем поиск
      const { count, items } = await pubmedFetchAll({
        apiKey: apiKey || undefined,
        topic: bodyP.data.query,
        filters,
        maxTotal: bodyP.data.maxResults,
        throttleMs: apiKey ? 100 : 350, // С ключом можно быстрее
      });
      
      // Сохраняем статьи и добавляем в проект
      let added = 0;
      let skipped = 0;
      const articleIds: string[] = [];
      const newArticleIds: string[] = []; // Новые статьи для перевода
      
      // Типы публикации из фильтров поиска
      const searchPubTypes = bodyP.data.filters?.publicationTypes || [];
      
      for (const article of items) {
        try {
          const articleId = await findOrCreateArticle(article, searchPubTypes);
          articleIds.push(articleId);
          
          const wasAdded = await addArticleToProject(paramsP.data.id, articleId, userId);
          if (wasAdded) {
            added++;
            newArticleIds.push(articleId);
          } else {
            skipped++;
          }
        } catch (err) {
          // Пропускаем ошибки отдельных статей
          console.error("Error saving article:", err);
        }
      }
      
      // Перевод если запрошен
      let translated = 0;
      if (shouldTranslate && newArticleIds.length > 0) {
        const openrouterKey = await getUserApiKey(userId, "openrouter");
        
        if (openrouterKey) {
          // Получаем статьи без переводов
          const toTranslate = await pool.query(
            `SELECT id, title_en, abstract_en FROM articles 
             WHERE id = ANY($1) AND title_ru IS NULL`,
            [newArticleIds]
          );
          
          if (toTranslate.rows.length > 0) {
            try {
              // Переводим пакетами по 5 статей для надёжности
              const BATCH_SIZE = 5;
              for (let i = 0; i < toTranslate.rows.length; i += BATCH_SIZE) {
                const batch = toTranslate.rows.slice(i, i + BATCH_SIZE);
                
                const { results } = await translateArticlesBatchOptimized(
                  openrouterKey,
                  batch
                );
                
                // Сохраняем переводы
                for (const [articleId, tr] of results) {
                  if (tr.title_ru || tr.abstract_ru) {
                    await pool.query(
                      `UPDATE articles SET 
                        title_ru = COALESCE($1, title_ru), 
                        abstract_ru = COALESCE($2, abstract_ru)
                       WHERE id = $3`,
                      [tr.title_ru || null, tr.abstract_ru || null, articleId]
                    );
                    translated++;
                  }
                }
              }
            } catch (err) {
              console.error("Translation batch error:", err);
            }
          }
        }
      }
      
      // Обновляем updated_at проекта
      await pool.query(
        `UPDATE projects SET updated_at = now() WHERE id = $1`,
        [paramsP.data.id]
      );
      
      let message = skipped > 0 
        ? `${added} новых статей добавлено, ${skipped} уже были в проекте`
        : `${added} статей добавлено`;
      
      if (translated > 0) {
        message += `, ${translated} переведено`;
      }
      
      return {
        totalFound: count,
        fetched: items.length,
        added,
        skipped,
        translated,
        message,
      };
    }
  );

  // GET /api/projects/:id/articles - список статей проекта
  fastify.get(
    "/projects/:id/articles",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      // Проверка доступа
      const access = await checkProjectAccess(paramsP.data.id, userId);
      if (!access.ok) {
        return reply.code(404).send({ error: "Project not found" });
      }
      
      // Query params для фильтрации
      const query = request.query as any;
      const status = query.status; // candidate, selected, excluded
      const hasStats = query.hasStats === "true";
      
      let sql = `
        SELECT 
          a.id, a.doi, a.pmid, a.title_en, a.title_ru, 
          a.abstract_en, a.abstract_ru,
          a.authors, a.year, a.journal, a.url, a.source,
          a.has_stats, a.stats_json, a.stats_quality, a.publication_types,
          pa.status, pa.notes, pa.tags, pa.added_at
        FROM project_articles pa
        JOIN articles a ON a.id = pa.article_id
        WHERE pa.project_id = $1
      `;
      const params: any[] = [paramsP.data.id];
      let paramIdx = 2;
      
      if (status && ["candidate", "selected", "excluded"].includes(status)) {
        sql += ` AND pa.status = $${paramIdx++}`;
        params.push(status);
      }
      
      if (hasStats) {
        sql += ` AND a.has_stats = true`;
      }
      
      sql += ` ORDER BY pa.added_at DESC`;
      
      const res = await pool.query(sql, params);
      
      // Подсчёт по статусам
      const countsRes = await pool.query(
        `SELECT status, COUNT(*)::int as count 
         FROM project_articles 
         WHERE project_id = $1 
         GROUP BY status`,
        [paramsP.data.id]
      );
      
      const counts: Record<string, number> = {
        candidate: 0,
        selected: 0,
        excluded: 0,
      };
      for (const row of countsRes.rows) {
        counts[row.status] = row.count;
      }
      
      return {
        articles: res.rows,
        counts,
        total: res.rowCount,
      };
    }
  );

  // PATCH /api/projects/:id/articles/:articleId - изменить статус/заметки
  fastify.patch(
    "/projects/:id/articles/:articleId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ArticleIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }
      
      const bodyP = ArticleStatusSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }
      
      // Проверка доступа (нужен edit)
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      const res = await pool.query(
        `UPDATE project_articles 
         SET status = $1, notes = COALESCE($2, notes)
         WHERE project_id = $3 AND article_id = $4
         RETURNING *`,
        [bodyP.data.status, bodyP.data.notes, paramsP.data.id, paramsP.data.articleId]
      );
      
      if (res.rowCount === 0) {
        return reply.code(404).send({ error: "Article not found in project" });
      }
      
      return { ok: true, article: res.rows[0] };
    }
  );

  // DELETE /api/projects/:id/articles/:articleId - удалить из проекта
  fastify.delete(
    "/projects/:id/articles/:articleId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ArticleIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }
      
      // Проверка доступа (нужен edit)
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      await pool.query(
        `DELETE FROM project_articles WHERE project_id = $1 AND article_id = $2`,
        [paramsP.data.id, paramsP.data.articleId]
      );
      
      return { ok: true };
    }
  );

  // POST /api/projects/:id/articles/bulk-status - массовое изменение статуса
  fastify.post(
    "/projects/:id/articles/bulk-status",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      const bodySchema = z.object({
        articleIds: z.array(z.string().uuid()).min(1).max(100),
        status: z.enum(["candidate", "selected", "excluded"]),
      });
      
      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }
      
      // Проверка доступа
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      const res = await pool.query(
        `UPDATE project_articles 
         SET status = $1
         WHERE project_id = $2 AND article_id = ANY($3)`,
        [bodyP.data.status, paramsP.data.id, bodyP.data.articleIds]
      );
      
      return { ok: true, updated: res.rowCount };
    }
  );

  // POST /api/projects/:id/articles/translate - перевод статей
  fastify.post(
    "/projects/:id/articles/translate",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;
      
      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }
      
      const bodySchema = z.object({
        articleIds: z.array(z.string().uuid()).min(1).max(50).optional(),
        untranslatedOnly: z.boolean().default(true),
      });
      
      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }
      
      // Проверка доступа
      const access = await checkProjectAccess(paramsP.data.id, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }
      
      // Получить ключ OpenRouter
      const openrouterKey = await getUserApiKey(userId, "openrouter");
      if (!openrouterKey) {
        return reply.code(400).send({ 
          error: "OpenRouter API ключ не настроен. Добавьте его в настройках." 
        });
      }
      
      // Получить статьи для перевода
      let sql = `
        SELECT a.id, a.title_en, a.abstract_en 
        FROM articles a
        JOIN project_articles pa ON pa.article_id = a.id
        WHERE pa.project_id = $1
      `;
      const params: any[] = [paramsP.data.id];
      
      if (bodyP.data.articleIds?.length) {
        sql += ` AND a.id = ANY($2)`;
        params.push(bodyP.data.articleIds);
      }
      
      if (bodyP.data.untranslatedOnly) {
        sql += ` AND a.title_ru IS NULL`;
      }
      
      sql += ` LIMIT 50`; // Ограничение для безопасности
      
      const toTranslate = await pool.query(sql, params);
      
      if (toTranslate.rows.length === 0) {
        return { 
          ok: true, 
          translated: 0, 
          message: "Нет статей для перевода" 
        };
      }
      
      // Переводим (маленькие батчи для надёжности)
      let translated = 0;
      const BATCH_SIZE = 5;
      
      for (let i = 0; i < toTranslate.rows.length; i += BATCH_SIZE) {
        const batch = toTranslate.rows.slice(i, i + BATCH_SIZE);
        
        try {
          const { results } = await translateArticlesBatchOptimized(
            openrouterKey,
            batch
          );
          
          for (const [articleId, tr] of results) {
            if (tr.title_ru || tr.abstract_ru) {
              await pool.query(
                `UPDATE articles SET 
                  title_ru = COALESCE($1, title_ru), 
                  abstract_ru = COALESCE($2, abstract_ru)
                 WHERE id = $3`,
                [tr.title_ru || null, tr.abstract_ru || null, articleId]
              );
              translated++;
            }
          }
        } catch (err) {
          console.error("Translation batch error:", err);
        }
      }
      
      return { 
        ok: true, 
        translated, 
        total: toTranslate.rows.length,
        message: `Переведено ${translated} из ${toTranslate.rows.length} статей` 
      };
    }
  );
};

export default plugin;
