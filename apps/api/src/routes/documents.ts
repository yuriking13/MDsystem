import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { formatCitation, type CitationStyle, type BibliographyArticle } from "../lib/bibliography.js";

const ProjectIdSchema = z.object({
  projectId: z.string().uuid(),
});

const DocumentIdSchema = z.object({
  projectId: z.string().uuid(),
  docId: z.string().uuid(),
});

const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

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

const plugin: FastifyPluginAsync = async (fastify) => {
  // GET /api/projects/:projectId/documents - список документов
  fastify.get(
    "/projects/:projectId/documents",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId);
      if (!access.ok) {
        return reply.code(404).send({ error: "Project not found" });
      }

      const res = await pool.query(
        `SELECT id, title, parent_id, order_index, created_at, updated_at
         FROM documents
         WHERE project_id = $1
         ORDER BY order_index, created_at`,
        [paramsP.data.projectId]
      );

      return { documents: res.rows };
    }
  );

  // GET /api/projects/:projectId/documents/:docId - один документ
  fastify.get(
    "/projects/:projectId/documents/:docId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId);
      if (!access.ok) {
        return reply.code(404).send({ error: "Project not found" });
      }

      const res = await pool.query(
        `SELECT d.*, 
          (SELECT json_agg(json_build_object(
            'id', c.id,
            'article_id', c.article_id,
            'order_index', c.order_index,
            'inline_number', c.inline_number,
            'page_range', c.page_range,
            'note', c.note,
            'article', json_build_object(
              'id', a.id,
              'title_en', a.title_en,
              'title_ru', a.title_ru,
              'authors', a.authors,
              'year', a.year,
              'journal', a.journal,
              'doi', a.doi,
              'pmid', a.pmid
            )
          ) ORDER BY c.order_index)
          FROM citations c
          JOIN articles a ON a.id = c.article_id
          WHERE c.document_id = d.id
         ) as citations
         FROM documents d
         WHERE d.id = $1 AND d.project_id = $2`,
        [paramsP.data.docId, paramsP.data.projectId]
      );

      if (res.rowCount === 0) {
        return reply.code(404).send({ error: "Document not found" });
      }

      return { document: res.rows[0] };
    }
  );

  // POST /api/projects/:projectId/documents - создать документ
  fastify.post(
    "/projects/:projectId/documents",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const bodyP = CreateDocumentSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      // Получить max order_index
      const maxOrder = await pool.query(
        `SELECT COALESCE(MAX(order_index), -1) + 1 as next_order
         FROM documents WHERE project_id = $1`,
        [paramsP.data.projectId]
      );

      const res = await pool.query(
        `INSERT INTO documents (project_id, title, content, parent_id, order_index, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          paramsP.data.projectId,
          bodyP.data.title,
          bodyP.data.content || "",
          bodyP.data.parentId || null,
          maxOrder.rows[0].next_order,
          userId,
        ]
      );

      return { document: res.rows[0] };
    }
  );

  // PATCH /api/projects/:projectId/documents/:docId - обновить документ
  fastify.patch(
    "/projects/:projectId/documents/:docId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const bodyP = UpdateDocumentSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (bodyP.data.title !== undefined) {
        updates.push(`title = $${idx++}`);
        values.push(bodyP.data.title);
      }
      if (bodyP.data.content !== undefined) {
        updates.push(`content = $${idx++}`);
        values.push(bodyP.data.content);
      }
      if (bodyP.data.orderIndex !== undefined) {
        updates.push(`order_index = $${idx++}`);
        values.push(bodyP.data.orderIndex);
      }

      updates.push(`updated_at = now()`);

      values.push(paramsP.data.docId);
      values.push(paramsP.data.projectId);

      const res = await pool.query(
        `UPDATE documents SET ${updates.join(", ")}
         WHERE id = $${idx++} AND project_id = $${idx}
         RETURNING *`,
        values
      );

      if (res.rowCount === 0) {
        return reply.code(404).send({ error: "Document not found" });
      }

      return { document: res.rows[0] };
    }
  );

  // DELETE /api/projects/:projectId/documents/:docId - удалить документ
  fastify.delete(
    "/projects/:projectId/documents/:docId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      await pool.query(
        `DELETE FROM documents WHERE id = $1 AND project_id = $2`,
        [paramsP.data.docId, paramsP.data.projectId]
      );

      return { ok: true };
    }
  );

  // POST /api/projects/:projectId/documents/:docId/citations - добавить цитату
  fastify.post(
    "/projects/:projectId/documents/:docId/citations",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const bodySchema = z.object({
        articleId: z.string().uuid(),
        pageRange: z.string().max(50).optional(),
      });

      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      // Получить следующий номер
      const maxOrder = await pool.query(
        `SELECT COALESCE(MAX(order_index), 0) + 1 as next_order,
                COALESCE(MAX(inline_number), 0) + 1 as next_number
         FROM citations WHERE document_id = $1`,
        [paramsP.data.docId]
      );

      try {
        const res = await pool.query(
          `INSERT INTO citations (document_id, article_id, order_index, inline_number, page_range)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (document_id, article_id) DO UPDATE SET page_range = EXCLUDED.page_range
           RETURNING *`,
          [
            paramsP.data.docId,
            bodyP.data.articleId,
            maxOrder.rows[0].next_order,
            maxOrder.rows[0].next_number,
            bodyP.data.pageRange || null,
          ]
        );

        return { citation: res.rows[0] };
      } catch (err) {
        return reply.code(400).send({ error: "Failed to add citation" });
      }
    }
  );

  // PATCH /api/projects/:projectId/documents/:docId/citations/:citationId - обновить цитату
  fastify.patch(
    "/projects/:projectId/documents/:docId/citations/:citationId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsSchema = z.object({
        projectId: z.string().uuid(),
        docId: z.string().uuid(),
        citationId: z.string().uuid(),
      });

      const paramsP = paramsSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const bodySchema = z.object({
        note: z.string().max(2000).optional(),
        pageRange: z.string().max(50).optional(),
      });

      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (bodyP.data.note !== undefined) {
        updates.push(`note = $${idx++}`);
        values.push(bodyP.data.note || null);
      }
      if (bodyP.data.pageRange !== undefined) {
        updates.push(`page_range = $${idx++}`);
        values.push(bodyP.data.pageRange || null);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: "No fields to update" });
      }

      values.push(paramsP.data.citationId);
      values.push(paramsP.data.docId);

      const res = await pool.query(
        `UPDATE citations SET ${updates.join(", ")}
         WHERE id = $${idx++} AND document_id = $${idx}
         RETURNING *`,
        values
      );

      if (res.rowCount === 0) {
        return reply.code(404).send({ error: "Citation not found" });
      }

      return { citation: res.rows[0] };
    }
  );

  // DELETE /api/projects/:projectId/documents/:docId/citations/:citationId
  fastify.delete(
    "/projects/:projectId/documents/:docId/citations/:citationId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsSchema = z.object({
        projectId: z.string().uuid(),
        docId: z.string().uuid(),
        citationId: z.string().uuid(),
      });

      const paramsP = paramsSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      await pool.query(
        `DELETE FROM citations WHERE id = $1 AND document_id = $2`,
        [paramsP.data.citationId, paramsP.data.docId]
      );

      // Перенумеровать оставшиеся
      await pool.query(
        `WITH numbered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY order_index) as new_num
          FROM citations WHERE document_id = $1
        )
        UPDATE citations c
        SET inline_number = n.new_num, order_index = n.new_num - 1
        FROM numbered n
        WHERE c.id = n.id`,
        [paramsP.data.docId]
      );

      return { ok: true };
    }
  );

  // GET /api/projects/:projectId/export - экспорт всех документов со списком литературы
  fastify.get(
    "/projects/:projectId/export",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId);
      if (!access.ok) {
        return reply.code(404).send({ error: "Project not found" });
      }

      // Получить стиль цитирования проекта
      const projectRes = await pool.query(
        `SELECT citation_style, name FROM projects WHERE id = $1`,
        [paramsP.data.projectId]
      );
      const citationStyle = (projectRes.rows[0]?.citation_style || 'gost') as CitationStyle;
      const projectName = projectRes.rows[0]?.name || 'Project';

      // Получить все документы
      const docsRes = await pool.query(
        `SELECT id, title, content, order_index
         FROM documents
         WHERE project_id = $1
         ORDER BY order_index, created_at`,
        [paramsP.data.projectId]
      );

      // Получить все уникальные цитаты из всех документов проекта
      const citationsRes = await pool.query(
        `SELECT DISTINCT ON (a.id)
           a.id, a.title_en, a.title_ru, a.authors, a.year, a.journal,
           a.doi, a.pmid,
           (a.raw_json->'crossref'->>'volume') as volume,
           (a.raw_json->'crossref'->>'issue') as issue,
           (a.raw_json->'crossref'->>'pages') as pages
         FROM citations c
         JOIN documents d ON d.id = c.document_id
         JOIN articles a ON a.id = c.article_id
         WHERE d.project_id = $1
         ORDER BY a.id, c.order_index`,
        [paramsP.data.projectId]
      );

      // Форматировать список литературы
      const bibliography = citationsRes.rows.map((article: any, index: number) => {
        const bibArticle: BibliographyArticle = {
          title_en: article.title_en,
          title_ru: article.title_ru,
          authors: article.authors,
          journal: article.journal,
          year: article.year,
          volume: article.volume,
          issue: article.issue,
          pages: article.pages,
          doi: article.doi,
          pmid: article.pmid,
        };
        return {
          number: index + 1,
          articleId: article.id,
          formatted: formatCitation(bibArticle, citationStyle),
        };
      });

      return {
        projectName,
        citationStyle,
        documents: docsRes.rows,
        bibliography,
      };
    }
  );

  // GET /api/projects/:projectId/bibliography - только список литературы
  fastify.get(
    "/projects/:projectId/bibliography",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const querySchema = z.object({
        style: z.enum(['gost', 'apa', 'vancouver']).optional(),
      });
      const queryP = querySchema.safeParse(request.query);

      const access = await checkProjectAccess(paramsP.data.projectId, userId);
      if (!access.ok) {
        return reply.code(404).send({ error: "Project not found" });
      }

      // Получить стиль цитирования проекта
      const projectRes = await pool.query(
        `SELECT citation_style FROM projects WHERE id = $1`,
        [paramsP.data.projectId]
      );
      const citationStyle = (queryP.success && queryP.data.style) 
        || projectRes.rows[0]?.citation_style 
        || 'gost';

      // Получить все уникальные цитаты
      const citationsRes = await pool.query(
        `SELECT DISTINCT ON (a.id)
           a.id, a.title_en, a.title_ru, a.authors, a.year, a.journal,
           a.doi, a.pmid, a.volume, a.issue, a.pages
         FROM citations c
         JOIN documents d ON d.id = c.document_id
         JOIN articles a ON a.id = c.article_id
         WHERE d.project_id = $1
         ORDER BY a.id`,
        [paramsP.data.projectId]
      );

      const bibliography = citationsRes.rows.map((article: any, index: number) => {
        const bibArticle: BibliographyArticle = {
          title_en: article.title_en,
          title_ru: article.title_ru,
          authors: article.authors,
          journal: article.journal,
          year: article.year,
          volume: article.volume,
          issue: article.issue,
          pages: article.pages,
          doi: article.doi,
          pmid: article.pmid,
        };
        return {
          number: index + 1,
          articleId: article.id,
          formatted: formatCitation(bibArticle, citationStyle as CitationStyle),
          raw: bibArticle,
        };
      });

      return { citationStyle, bibliography };
    }
  );
  // GET /api/projects/:projectId/citation-graph - данные для графа цитирований
  fastify.get(
    "/projects/:projectId/citation-graph",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId);
      if (!access.ok) {
        return reply.code(404).send({ error: "Project not found" });
      }

      // Получить все статьи проекта с их raw_json (Crossref данные)
      const articlesRes = await pool.query(
        `SELECT a.id, a.doi, a.title_en, a.authors, a.year, a.raw_json,
                pa.status
         FROM project_articles pa
         JOIN articles a ON a.id = pa.article_id
         WHERE pa.project_id = $1 AND pa.status != 'excluded'`,
        [paramsP.data.projectId]
      );

      // Строим nodes и links
      const nodes: { id: string; label: string; year: number | null; status: string; doi: string | null }[] = [];
      const links: { source: string; target: string }[] = [];
      const doiToId = new Map<string, string>();

      // Создаём узлы из статей проекта
      for (const article of articlesRes.rows) {
        const shortTitle = article.title_en?.slice(0, 40) + (article.title_en?.length > 40 ? '...' : '');
        const firstAuthor = article.authors?.[0]?.split(' ')[0] || 'Unknown';
        const label = `${firstAuthor} (${article.year || '?'})`;
        
        nodes.push({
          id: article.id,
          label,
          year: article.year,
          status: article.status,
          doi: article.doi,
        });

        if (article.doi) {
          doiToId.set(article.doi.toLowerCase(), article.id);
        }
      }

      // Добавляем связи на основе references из Crossref
      for (const article of articlesRes.rows) {
        // Crossref данные хранятся в raw_json.crossref
        const crossrefData = article.raw_json?.crossref;
        const references = crossrefData?.references || crossrefData?.reference || [];
        
        if (!Array.isArray(references) || references.length === 0) continue;

        for (const ref of references) {
          // DOI может быть в разных форматах
          const refDoi = ref.DOI || ref.doi || ref['unstructured']?.match(/10\.\d{4,}\/[^\s]+/)?.[0];
          if (!refDoi) continue;

          const targetId = doiToId.get(refDoi.toLowerCase());
          if (targetId && targetId !== article.id) {
            // Есть связь между статьями в проекте
            links.push({
              source: article.id,
              target: targetId,
            });
          }
        }
      }
      
      // Также ищем обратные связи через cited-by если есть
      // и добавляем связи на основе совпадения авторов/года для статей без Crossref

      return {
        nodes,
        links,
        stats: {
          totalNodes: nodes.length,
          totalLinks: links.length,
        },
      };
    }
  );
};

export default plugin;
