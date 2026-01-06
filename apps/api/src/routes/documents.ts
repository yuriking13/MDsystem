import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { formatCitation, type CitationStyle, type BibliographyArticle } from "../lib/bibliography.js";
import { pubmedFetchByPmids } from "../lib/pubmed.js";

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

      // Проверяем есть ли колонка sub_number
      let hasSubNumber = false;
      try {
        const checkCol = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'citations' AND column_name = 'sub_number'`
        );
        hasSubNumber = (checkCol.rowCount ?? 0) > 0;
      } catch {
        hasSubNumber = false;
      }

      const res = await pool.query(
        `SELECT d.*, 
          (SELECT json_agg(json_build_object(
            'id', c.id,
            'article_id', c.article_id,
            'order_index', c.order_index,
            'inline_number', c.inline_number,
            'sub_number', ${hasSubNumber ? 'c.sub_number' : '1'},
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
          ) ORDER BY c.inline_number, ${hasSubNumber ? 'c.sub_number' : 'c.order_index'})
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

  // PUT /api/projects/:projectId/documents/reorder - обновить порядок документов
  fastify.put(
    "/projects/:projectId/documents/reorder",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const bodySchema = z.object({
        documentIds: z.array(z.string().uuid()),
      });

      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body", message: bodyP.error.message });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      const { documentIds } = bodyP.data;

      // Update order_index for each document
      for (let i = 0; i < documentIds.length; i++) {
        await pool.query(
          `UPDATE documents SET order_index = $1, updated_at = NOW()
           WHERE id = $2 AND project_id = $3`,
          [i, documentIds[i], paramsP.data.projectId]
        );
      }

      return { ok: true };
    }
  );

  // POST /api/projects/:projectId/renumber-citations - перенумерация цитат после изменения порядка документов
  fastify.post(
    "/projects/:projectId/renumber-citations",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      const projectId = paramsP.data.projectId;

      // 1. Получить все документы в правильном порядке
      const docsRes = await pool.query(
        `SELECT id, content FROM documents 
         WHERE project_id = $1 
         ORDER BY order_index, created_at`,
        [projectId]
      );

      // 2. Получить все цитаты проекта с article_id
      const citationsRes = await pool.query(
        `SELECT c.id, c.document_id, c.article_id, c.inline_number
         FROM citations c
         JOIN documents d ON d.id = c.document_id
         WHERE d.project_id = $1
         ORDER BY d.order_index, c.inline_number`,
        [projectId]
      );

      // 3. Создаём глобальную нумерацию: article_id -> глобальный номер
      const articleToGlobalNumber = new Map<string, number>();
      let globalNumber = 1;
      
      // Обходим документы в порядке их order_index
      for (const doc of docsRes.rows) {
        // Получаем цитаты этого документа
        const docCitations = citationsRes.rows.filter(c => c.document_id === doc.id);
        
        // Сортируем по inline_number (порядок появления в документе)
        docCitations.sort((a, b) => a.inline_number - b.inline_number);
        
        for (const citation of docCitations) {
          if (!articleToGlobalNumber.has(citation.article_id)) {
            articleToGlobalNumber.set(citation.article_id, globalNumber);
            globalNumber++;
          }
        }
      }

      // 4. Обновляем inline_number для всех цитат
      const oldToNewMapping = new Map<string, { oldNum: number; newNum: number; docId: string }>();
      
      for (const citation of citationsRes.rows) {
        const newNum = articleToGlobalNumber.get(citation.article_id);
        if (newNum !== undefined && newNum !== citation.inline_number) {
          oldToNewMapping.set(citation.id, {
            oldNum: citation.inline_number,
            newNum,
            docId: citation.document_id,
          });
          
          await pool.query(
            `UPDATE citations SET inline_number = $1 WHERE id = $2`,
            [newNum, citation.id]
          );
        }
      }

      // 5. Обновляем контент документов - заменяем номера цитат в HTML
      for (const doc of docsRes.rows) {
        let content = doc.content || '';
        let updated = false;
        
        // Получаем все изменения для этого документа
        const docChanges = Array.from(oldToNewMapping.entries())
          .filter(([, v]) => v.docId === doc.id)
          .map(([citationId, v]) => ({ citationId, ...v }));
        
        if (docChanges.length === 0) continue;

        // Заменяем data-citation-number и текст [n] для каждой цитаты
        for (const change of docChanges) {
          // Заменяем data-citation-number в атрибуте
          const oldAttrPattern = new RegExp(
            `(<span[^>]*data-citation-id="${change.citationId}"[^>]*)data-citation-number="${change.oldNum}"`,
            'g'
          );
          content = content.replace(oldAttrPattern, `$1data-citation-number="${change.newNum}"`);
          
          // Заменяем текст [n] внутри span с этим citation-id
          const oldTextPattern = new RegExp(
            `(<span[^>]*data-citation-id="${change.citationId}"[^>]*>)\\[${change.oldNum}\\](<\\/span>)`,
            'g'
          );
          content = content.replace(oldTextPattern, `$1[${change.newNum}]$2`);
          
          updated = true;
        }

        if (updated) {
          await pool.query(
            `UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2`,
            [content, doc.id]
          );
        }
      }

      // 6. Возвращаем обновлённые документы
      const updatedDocsRes = await pool.query(
        `SELECT id, title, content, order_index, created_at, updated_at
         FROM documents
         WHERE project_id = $1
         ORDER BY order_index, created_at`,
        [projectId]
      );

      return { 
        ok: true, 
        renumbered: oldToNewMapping.size,
        documents: updatedDocsRes.rows,
      };
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
        note: z.string().max(2000).optional(),
      });

      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      // Проверяем, есть ли уже цитаты на этот источник
      const existingCitations = await pool.query(
        `SELECT inline_number FROM citations 
         WHERE document_id = $1 AND article_id = $2 
         ORDER BY inline_number LIMIT 1`,
        [paramsP.data.docId, bodyP.data.articleId]
      );

      let inlineNumber: number;
      let subNumber = 1;

      if ((existingCitations.rowCount ?? 0) > 0) {
        // Есть существующие цитаты - используем тот же номер, но новый sub_number
        inlineNumber = existingCitations.rows[0].inline_number;
        
        // Получить следующий sub_number для этого источника
        const maxSub = await pool.query(
          `SELECT COALESCE(MAX(sub_number), 0) + 1 as next_sub
           FROM citations WHERE document_id = $1 AND article_id = $2`,
          [paramsP.data.docId, bodyP.data.articleId]
        );
        subNumber = maxSub.rows[0].next_sub;
      } else {
        // Новый источник - получить следующий inline_number
        const maxNum = await pool.query(
          `SELECT COALESCE(MAX(inline_number), 0) + 1 as next_number
           FROM citations WHERE document_id = $1`,
          [paramsP.data.docId]
        );
        inlineNumber = maxNum.rows[0].next_number;
      }

      // Получить следующий order_index
      const maxOrder = await pool.query(
        `SELECT COALESCE(MAX(order_index), 0) + 1 as next_order
         FROM citations WHERE document_id = $1`,
        [paramsP.data.docId]
      );

      try {
        // Проверяем есть ли колонка sub_number
        let hasSubNumber = false;
        try {
          const checkCol = await pool.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = 'citations' AND column_name = 'sub_number'`
          );
          hasSubNumber = (checkCol.rowCount ?? 0) > 0;
        } catch {
          hasSubNumber = false;
        }

        const res = await pool.query(
          hasSubNumber
            ? `INSERT INTO citations (document_id, article_id, order_index, inline_number, sub_number, page_range, note)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING *`
            : `INSERT INTO citations (document_id, article_id, order_index, inline_number, page_range, note)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING *`,
          hasSubNumber
            ? [
                paramsP.data.docId,
                bodyP.data.articleId,
                maxOrder.rows[0].next_order,
                inlineNumber,
                subNumber,
                bodyP.data.pageRange || null,
                bodyP.data.note || null,
              ]
            : [
                paramsP.data.docId,
                bodyP.data.articleId,
                maxOrder.rows[0].next_order,
                inlineNumber,
                bodyP.data.pageRange || null,
                bodyP.data.note || null,
              ]
        );

        return { citation: { ...res.rows[0], sub_number: subNumber } };
      } catch (err) {
        console.error('Add citation error:', err);
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

      // Проверяем существование колонок volume
      let hasVolumeColumns = false;
      try {
        const checkCol = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'articles' AND column_name = 'volume'`
        );
        hasVolumeColumns = (checkCol.rowCount ?? 0) > 0;
      } catch {
        hasVolumeColumns = false;
      }

      // Получить все уникальные цитаты из всех документов проекта
      const citationsRes = await pool.query(
        hasVolumeColumns
          ? `SELECT DISTINCT ON (a.id)
               a.id, a.title_en, a.title_ru, a.authors, a.year, a.journal,
               a.doi, a.pmid,
               COALESCE(a.volume, a.raw_json->'crossref'->>'volume') as volume,
               COALESCE(a.issue, a.raw_json->'crossref'->>'issue') as issue,
               COALESCE(a.pages, a.raw_json->'crossref'->>'pages') as pages
             FROM citations c
             JOIN documents d ON d.id = c.document_id
             JOIN articles a ON a.id = c.article_id
             WHERE d.project_id = $1
             ORDER BY a.id, c.order_index`
          : `SELECT DISTINCT ON (a.id)
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

      // Создаём маппинг articleId -> новый номер в общем списке
      const articleToNumber = new Map<string, number>();
      for (const bib of bibliography) {
        articleToNumber.set(bib.articleId, bib.number);
      }

      // Получаем все цитаты с их document_id и article_id
      const allCitationsRes = await pool.query(
        `SELECT c.document_id, c.article_id, c.inline_number
         FROM citations c
         JOIN documents d ON d.id = c.document_id
         WHERE d.project_id = $1
         ORDER BY c.document_id, c.inline_number`,
        [paramsP.data.projectId]
      );

      // Создаём маппинг (document_id, inline_number) -> новый глобальный номер
      const citationMapping = new Map<string, number>();
      for (const c of allCitationsRes.rows) {
        const key = `${c.document_id}:${c.inline_number}`;
        const globalNum = articleToNumber.get(c.article_id);
        if (globalNum !== undefined) {
          citationMapping.set(key, globalNum);
        }
      }

      // Объединённый контент с перенумерованными цитатами
      let mergedContent = '';
      for (const doc of docsRes.rows) {
        if (mergedContent) {
          mergedContent += '<hr class="chapter-break" />';
        }
        mergedContent += `<h1 class="chapter-title">${doc.title}</h1>`;
        
        // Перенумеровываем цитаты в контенте
        let content = doc.content || '';
        // Заменяем [n] на глобальные номера
        content = content.replace(
          /data-citation-number="(\d+)"/g,
          (match: string, num: string) => {
            const key = `${doc.id}:${num}`;
            const globalNum = citationMapping.get(key);
            if (globalNum !== undefined) {
              return `data-citation-number="${globalNum}"`;
            }
            return match;
          }
        );
        // Также заменяем текст [n] внутри span
        content = content.replace(
          /<span class="citation-ref"[^>]*>\[(\d+)\]<\/span>/g,
          (match: string, num: string) => {
            // Ищем data-citation-number в этом же span
            const numMatch = match.match(/data-citation-number="(\d+)"/);
            if (numMatch) {
              const key = `${doc.id}:${numMatch[1]}`;
              const globalNum = citationMapping.get(key);
              if (globalNum !== undefined) {
                return match.replace(`[${num}]`, `[${globalNum}]`);
              }
            }
            return match;
          }
        );
        
        mergedContent += content;
      }

      return {
        projectName,
        citationStyle,
        documents: docsRes.rows,
        bibliography,
        mergedContent, // Объединённый контент с перенумерованными цитатами
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

      // Получить все уникальные цитаты (с проверкой существования колонок)
      let hasVolumeColumns = false;
      try {
        const checkCol = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'articles' AND column_name = 'volume'`
        );
        hasVolumeColumns = (checkCol.rowCount ?? 0) > 0;
      } catch {
        hasVolumeColumns = false;
      }

      const citationsRes = await pool.query(
        hasVolumeColumns
          ? `SELECT DISTINCT ON (a.id)
               a.id, a.title_en, a.title_ru, a.authors, a.year, a.journal,
               a.doi, a.pmid, a.volume, a.issue, a.pages
             FROM citations c
             JOIN documents d ON d.id = c.document_id
             JOIN articles a ON a.id = c.article_id
             WHERE d.project_id = $1
             ORDER BY a.id`
          : `SELECT DISTINCT ON (a.id)
               a.id, a.title_en, a.title_ru, a.authors, a.year, a.journal,
               a.doi, a.pmid, 
               NULL as volume, NULL as issue, NULL as pages
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
  // Query параметры:
  // - filter: 'all' | 'selected' | 'excluded' (по умолчанию 'all')
  // - sourceQueries: JSON массив строк запросов для фильтрации
  // - depth: 1 | 2 | 3 - уровень глубины графа (по умолчанию 1)
  //   1 = только статьи проекта + связи между ними
  //   2 = + статьи, на которые ссылаются (references) - топ N
  //   3 = + статьи, которые цитируют (cited_by) - топ N
  // - yearFrom: минимальный год публикации
  // - yearTo: максимальный год публикации
  // - statsQuality: минимальное качество статистики (0-3)
  // - maxLinksPerNode: макс связей на узел (по умолчанию 10, макс 50)
  // - maxTotalNodes: макс узлов в графе (по умолчанию 500, макс 2000)
  // 
  // ВАЖНО: Статьи с references_fetched_at НЕ NULL считаются "проанализированными"
  // и исключаются из расширения графа (на них могут ссылаться, они сами - нет)
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

      // Параметры фильтрации
      const query = request.query as { 
        filter?: string; 
        sourceQueries?: string;
        depth?: string;
        yearFrom?: string;
        yearTo?: string;
        statsQuality?: string;
        maxLinksPerNode?: string;
        maxTotalNodes?: string;
      };
      
      // Mega режим отключён - всегда используем lite с лимитами
      const filter = query.filter || 'all';
      const depth = Math.min(3, Math.max(1, parseInt(query.depth || '1', 10) || 1));
      const yearFrom = query.yearFrom ? parseInt(query.yearFrom, 10) : undefined;
      const yearTo = query.yearTo ? parseInt(query.yearTo, 10) : undefined;
      const statsQuality = query.statsQuality ? parseInt(query.statsQuality, 10) : undefined;
      
      // Лимиты для графа (mega режим отключён)
      const maxLinksPerNode = Math.min(50, Math.max(1, parseInt(query.maxLinksPerNode || '10', 10) || 10));
      const maxTotalNodes = Math.min(2000, Math.max(10, parseInt(query.maxTotalNodes || '500', 10) || 500));
      
      let sourceQueries: string[] = [];
      if (query.sourceQueries) {
        try {
          sourceQueries = JSON.parse(query.sourceQueries);
        } catch {
          sourceQueries = [];
        }
      }

      // Проверяем существование колонок reference_pmids, source_query и stats_quality
      let hasRefColumns = false;
      let hasSourceQueryCol = false;
      let hasStatsQuality = false;
      try {
        const checkCol = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'articles' AND column_name = 'reference_pmids'`
        );
        hasRefColumns = (checkCol.rowCount ?? 0) > 0;
        
        const checkSqCol = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'project_articles' AND column_name = 'source_query'`
        );
        hasSourceQueryCol = (checkSqCol.rowCount ?? 0) > 0;
        
        const checkStatsCol = await pool.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'articles' AND column_name = 'stats_quality'`
        );
        hasStatsQuality = (checkStatsCol.rowCount ?? 0) > 0;
      } catch {
        hasRefColumns = false;
        hasSourceQueryCol = false;
        hasStatsQuality = false;
      }

      // Строим условие WHERE (никогда не показываем удалённые в графе)
      let statusCondition = ` AND pa.status != 'deleted'`;
      if (filter === 'selected') {
        statusCondition = ` AND pa.status = 'selected'`;
      } else if (filter === 'excluded') {
        statusCondition = ` AND pa.status = 'excluded'`;
      }
      // Для 'all' — показываем все статусы кроме deleted
      
      // Условие по source_query
      let sourceQueryCondition = '';
      const queryParams: any[] = [paramsP.data.projectId];
      let paramIdx = 2;
      if (hasSourceQueryCol && sourceQueries.length > 0) {
        queryParams.push(sourceQueries);
        sourceQueryCondition = ` AND pa.source_query = ANY($${paramIdx++})`;
      }
      
      // Условие по году публикации
      let yearCondition = '';
      if (yearFrom !== undefined && !isNaN(yearFrom)) {
        queryParams.push(yearFrom);
        yearCondition += ` AND a.year >= $${paramIdx++}`;
      }
      if (yearTo !== undefined && !isNaN(yearTo)) {
        queryParams.push(yearTo);
        yearCondition += ` AND a.year <= $${paramIdx++}`;
      }
      
      // Условие по качеству статистики (stats_quality / p-value)
      let statsCondition = '';
      if (hasStatsQuality && statsQuality !== undefined && !isNaN(statsQuality) && statsQuality > 0) {
        queryParams.push(statsQuality);
        statsCondition = ` AND COALESCE(a.stats_quality, 0) >= $${paramIdx++}`;
      }

      // Получить все статьи проекта (Уровень 1) с их данными о references
      // Включаем references_fetched_at для определения уже проанализированных статей
      const articlesRes = await pool.query(
        hasRefColumns
          ? `SELECT a.id, a.doi, a.pmid, a.title_en, a.authors, a.year, 
                    a.raw_json, a.reference_pmids, a.cited_by_pmids, a.references_fetched_at,
                    ${hasStatsQuality ? 'COALESCE(a.stats_quality, 0) as stats_quality,' : '0 as stats_quality,'}
                    pa.status${hasSourceQueryCol ? ', pa.source_query' : ''},
                    1 as graph_level
             FROM project_articles pa
             JOIN articles a ON a.id = pa.article_id
             WHERE pa.project_id = $1${statusCondition}${sourceQueryCondition}${yearCondition}${statsCondition}`
          : `SELECT a.id, a.doi, a.pmid, a.title_en, a.authors, a.year, 
                    a.raw_json, 
                    ARRAY[]::text[] as reference_pmids, 
                    ARRAY[]::text[] as cited_by_pmids,
                    NULL as references_fetched_at,
                    ${hasStatsQuality ? 'COALESCE(a.stats_quality, 0) as stats_quality,' : '0 as stats_quality,'}
                    pa.status${hasSourceQueryCol ? ', pa.source_query' : ''},
                    1 as graph_level
             FROM project_articles pa
             JOIN articles a ON a.id = pa.article_id
             WHERE pa.project_id = $1${statusCondition}${sourceQueryCondition}${yearCondition}${statsCondition}`,
        queryParams
      );

      // Строим nodes и links
      type GraphNodeInternal = {
        id: string;
        label: string;
        title: string | null;
        year: number | null;
        status: string;
        doi: string | null;
        pmid: string | null;
        citedByCount: number;
        graphLevel: number;
        statsQuality: number;
      };
      const nodes: GraphNodeInternal[] = [];
      const links: { source: string; target: string }[] = [];
      const linksSet = new Set<string>(); // Для дедупликации
      const doiToId = new Map<string, string>();
      const pmidToId = new Map<string, string>();
      const addedNodeIds = new Set<string>();

      // Debug: Log first article's reference_pmids to verify data structure
      if (articlesRes.rows.length > 0) {
        const firstArticle = articlesRes.rows[0];
        console.log(`[CitationGraph] First article PMID: ${firstArticle.pmid}`);
        console.log(`[CitationGraph] reference_pmids type: ${typeof firstArticle.reference_pmids}`);
        console.log(`[CitationGraph] reference_pmids isArray: ${Array.isArray(firstArticle.reference_pmids)}`);
        console.log(`[CitationGraph] reference_pmids value: ${JSON.stringify(firstArticle.reference_pmids)?.slice(0, 200)}`);
        console.log(`[CitationGraph] references_fetched_at: ${firstArticle.references_fetched_at}`);
      }
      
      // Создаём узлы из статей проекта (Уровень 1)
      for (const article of articlesRes.rows) {
        const firstAuthor = article.authors?.[0]?.split(' ')[0] || 'Unknown';
        const label = `${firstAuthor} (${article.year || '?'})`;
        
        // Handle cited_by_pmids that might be string or array
        let citedByPmidsForCount: string[] = [];
        if (Array.isArray(article.cited_by_pmids)) {
          citedByPmidsForCount = article.cited_by_pmids;
        } else if (typeof article.cited_by_pmids === 'string' && article.cited_by_pmids.startsWith('{')) {
          citedByPmidsForCount = article.cited_by_pmids.slice(1, -1).split(',').filter(Boolean);
        }
        
        // Количество цитирований - берём максимум из PubMed cited_by и Europe PMC
        const pubmedCitedBy = citedByPmidsForCount.length;
        const europePMCCitations = article.raw_json?.europePMCCitations || 0;
        const citedByCount = Math.max(pubmedCitedBy, europePMCCitations);
        
        nodes.push({
          id: article.id,
          label,
          title: article.title_en || article.title_ru || null,
          year: article.year,
          status: article.status,
          doi: article.doi,
          pmid: article.pmid,
          citedByCount,
          graphLevel: 1,
          statsQuality: article.stats_quality || 0,
        });
        addedNodeIds.add(article.id);

        if (article.doi) {
          doiToId.set(article.doi.toLowerCase(), article.id);
        }
        if (article.pmid) {
          pmidToId.set(article.pmid, article.id);
        }
      }

      // Собираем PMIDs для уровней:
      // Уровень 0: статьи, которые цитируют наши (cited_by)
      // Уровень 2: статьи, на которые мы ссылаемся (references)
      // Уровень 3: статьи, которые тоже ссылаются на level 2 (связанные работы)
      const level0Pmids = new Set<string>(); // Статьи, которые цитируют наши
      const level2Pmids = new Set<string>(); // Статьи, на которые ссылаются (references)
      const level3Pmids = new Set<string>(); // Статьи, которые тоже ссылаются на level 2
      
      // Сохраняем связи
      const level1ToLevel2Links: { sourceId: string; targetPmid: string }[] = [];
      const level0ToLevel1Links: { sourcePmid: string; targetId: string }[] = []; // cited_by -> наши статьи
      
      // Массивы для сохранения статей для дальнейшей обработки связей
      let level0Articles: any[] = []; // cited_by
      let level2Articles: any[] = [];
      let level3Articles: any[] = [];
      
      // Для расширения графа используем ТОЛЬКО статьи с загруженными ссылками
      // (references_fetched_at IS NOT NULL означает что reference_pmids заполнены)
      
      if (depth >= 2) {
        for (const article of articlesRes.rows) {
          // Используем ТОЛЬКО статьи с загруженными ссылками
          // (references_fetched_at установлен после загрузки из PubMed)
          // if (!article.references_fetched_at) continue; // Можно включить для строгой проверки
          
          // Parse reference_pmids properly
          let refPmids: string[] = [];
          if (Array.isArray(article.reference_pmids)) {
            refPmids = article.reference_pmids;
          } else if (typeof article.reference_pmids === 'string' && article.reference_pmids.startsWith('{')) {
            refPmids = article.reference_pmids.slice(1, -1).split(',').filter(Boolean);
          }
          
          let addedForThisArticle = 0;
          for (const refPmid of refPmids) {
            // Ограничиваем количество связей на статью
            if (addedForThisArticle >= maxLinksPerNode) break;
            // Добавляем в level2 только PMIDs, которых ещё нет в проекте
            if (!pmidToId.has(refPmid)) {
              level2Pmids.add(refPmid);
              level1ToLevel2Links.push({ sourceId: article.id, targetPmid: refPmid });
              addedForThisArticle++;
            }
          }
        }
        console.log(`[CitationGraph] Depth ${depth}: collected ${level2Pmids.size} external reference PMIDs`);
      }
      
      // Уровень 0 (cited_by) загружаем при depth >= 3
      if (depth >= 3) {
        for (const article of articlesRes.rows) {
          // Parse cited_by_pmids properly
          let citedByPmids: string[] = [];
          if (Array.isArray(article.cited_by_pmids)) {
            citedByPmids = article.cited_by_pmids;
          } else if (typeof article.cited_by_pmids === 'string' && article.cited_by_pmids.startsWith('{')) {
            citedByPmids = article.cited_by_pmids.slice(1, -1).split(',').filter(Boolean);
          }
          
          let addedForThisArticle = 0;
          for (const citingPmid of citedByPmids) {
            // Ограничиваем количество связей на статью
            if (addedForThisArticle >= maxLinksPerNode) break;
            if (!pmidToId.has(citingPmid)) {
              level0Pmids.add(citingPmid);
              level0ToLevel1Links.push({ sourcePmid: citingPmid, targetId: article.id });
              addedForThisArticle++;
            }
          }
        }
        console.log(`[CitationGraph] Depth ${depth}: collected ${level0Pmids.size} citing article PMIDs`);
      }

      // Загружаем статьи уровня 2 (references) - сначала ищем в БД
      const level2InDb = new Map<string, any>(); // pmid -> article data
      const level2NotInDb = new Set<string>(); // PMIDs не в БД
      
      // Вычисляем сколько узлов уже есть и сколько можно добавить
      const currentNodeCount = () => addedNodeIds.size;
      const canAddMore = () => currentNodeCount() < maxTotalNodes;
      
      if (depth >= 2 && level2Pmids.size > 0) {
        // В lite режиме ограничиваем количество PMIDs для загрузки
        const remainingSlots = Math.max(0, maxTotalNodes - currentNodeCount());
        const level2PmidsArr = Array.from(level2Pmids).slice(0, remainingSlots);
        
        // Строим условия фильтрации для уровня 2
        let level2YearCondition = '';
        let level2StatsCondition = '';
        const level2Params: any[] = [level2PmidsArr];
        let level2ParamIdx = 2;
        
        if (yearFrom !== undefined && !isNaN(yearFrom)) {
          level2Params.push(yearFrom);
          level2YearCondition += ` AND year >= $${level2ParamIdx++}`;
        }
        if (yearTo !== undefined && !isNaN(yearTo)) {
          level2Params.push(yearTo);
          level2YearCondition += ` AND year <= $${level2ParamIdx++}`;
        }
        if (hasStatsQuality && statsQuality !== undefined && !isNaN(statsQuality) && statsQuality > 0) {
          level2Params.push(statsQuality);
          level2StatsCondition = ` AND COALESCE(stats_quality, 0) >= $${level2ParamIdx++}`;
        }
        
        const level2Res = await pool.query(
          `SELECT id, doi, pmid, title_en, authors, year, raw_json,
                  ${hasRefColumns ? 'reference_pmids, cited_by_pmids,' : "ARRAY[]::text[] as reference_pmids, ARRAY[]::text[] as cited_by_pmids,"}
                  ${hasStatsQuality ? 'COALESCE(stats_quality, 0) as stats_quality' : '0 as stats_quality'}
           FROM articles 
           WHERE pmid = ANY($1)${level2YearCondition}${level2StatsCondition}`,
          level2Params
        );
        
        // Сохраняем результаты для обработки связей позже
        level2Articles = level2Res.rows;
        
        // Помечаем найденные в БД
        for (const article of level2Res.rows) {
          level2InDb.set(article.pmid, article);
        }
        
        // Определяем какие PMIDs не в БД (но только если нет фильтров по году/stats)
        const hasFilters = (yearFrom !== undefined) || (yearTo !== undefined) || 
                          (statsQuality !== undefined && statsQuality > 0);
        if (!hasFilters) {
          for (const pmid of level2PmidsArr) {
            if (!level2InDb.has(pmid)) {
              level2NotInDb.add(pmid);
            }
          }
        }
        
        // Добавляем узлы для статей из БД
        for (const article of level2Res.rows) {
          if (addedNodeIds.has(article.id)) continue;
          
          const firstAuthor = article.authors?.[0]?.split(' ')[0] || 'Unknown';
          const label = `${firstAuthor} (${article.year || '?'})`;
          const pubmedCitedBy = article.cited_by_pmids?.length || 0;
          const europePMCCitations = article.raw_json?.europePMCCitations || 0;
          const citedByCount = Math.max(pubmedCitedBy, europePMCCitations);
          
          nodes.push({
            id: article.id,
            label,
            title: article.title_en || null,
            year: article.year,
            status: 'reference', // Особый статус для статей уровня 2
            doi: article.doi,
            pmid: article.pmid,
            citedByCount,
            graphLevel: 2,
            statsQuality: article.stats_quality || 0,
          });
          addedNodeIds.add(article.id);
          
          if (article.doi) {
            doiToId.set(article.doi.toLowerCase(), article.id);
          }
          if (article.pmid) {
            pmidToId.set(article.pmid, article.id);
          }
        }
        
        // Добавляем узлы для PMIDs которых нет в БД (показываем как "неизвестные")
        for (const pmid of level2NotInDb) {
          const nodeId = `pmid:${pmid}`; // Используем специальный ID
          if (addedNodeIds.has(nodeId)) continue;
          
          nodes.push({
            id: nodeId,
            label: `PMID:${pmid}`,
            title: null,
            year: null,
            status: 'reference',
            doi: null,
            pmid: pmid,
            citedByCount: 0,
            graphLevel: 2,
            statsQuality: 0,
          });
          addedNodeIds.add(nodeId);
          pmidToId.set(pmid, nodeId);
        }
      }

      // Загружаем статьи уровня 0 (citing articles - те кто цитирует нас) - сначала ищем в БД
      const level0InDb = new Map<string, any>(); // pmid -> article data
      const level0NotInDb = new Set<string>(); // PMIDs не в БД
      
      if (depth >= 3 && level0Pmids.size > 0 && canAddMore()) {
        // В lite режиме ограничиваем количество PMIDs для загрузки
        const remainingSlotsL0 = Math.max(0, maxTotalNodes - currentNodeCount());
        const level0PmidsArr = Array.from(level0Pmids).slice(0, remainingSlotsL0);
        
        // Строим условия фильтрации для уровня 0
        let level0YearCondition = '';
        let level0StatsCondition = '';
        const level0Params: any[] = [level0PmidsArr];
        let level0ParamIdx = 2;
        
        if (yearFrom !== undefined && !isNaN(yearFrom)) {
          level0Params.push(yearFrom);
          level0YearCondition += ` AND year >= $${level0ParamIdx++}`;
        }
        if (yearTo !== undefined && !isNaN(yearTo)) {
          level0Params.push(yearTo);
          level0YearCondition += ` AND year <= $${level0ParamIdx++}`;
        }
        if (hasStatsQuality && statsQuality !== undefined && !isNaN(statsQuality) && statsQuality > 0) {
          level0Params.push(statsQuality);
          level0StatsCondition = ` AND COALESCE(stats_quality, 0) >= $${level0ParamIdx++}`;
        }
        
        const level0Res = await pool.query(
          `SELECT id, doi, pmid, title_en, authors, year, raw_json,
                  ${hasRefColumns ? 'reference_pmids, cited_by_pmids,' : "ARRAY[]::text[] as reference_pmids, ARRAY[]::text[] as cited_by_pmids,"}
                  ${hasStatsQuality ? 'COALESCE(stats_quality, 0) as stats_quality' : '0 as stats_quality'}
           FROM articles 
           WHERE pmid = ANY($1)${level0YearCondition}${level0StatsCondition}`,
          level0Params
        );
        
        // Сохраняем результаты для обработки связей позже
        level0Articles = level0Res.rows;
        
        // Помечаем найденные в БД
        for (const article of level0Res.rows) {
          level0InDb.set(article.pmid, article);
        }
        
        // Определяем какие PMIDs не в БД (но только если нет фильтров по году/stats)
        const hasFilters = (yearFrom !== undefined) || (yearTo !== undefined) || 
                          (statsQuality !== undefined && statsQuality > 0);
        if (!hasFilters) {
          for (const pmid of level0PmidsArr) {
            if (!level0InDb.has(pmid)) {
              level0NotInDb.add(pmid);
            }
          }
        }
        
        // Добавляем узлы для статей из БД (уровень 0 - цитирующие нас)
        for (const article of level0Res.rows) {
          if (addedNodeIds.has(article.id)) continue;
          
          const firstAuthor = article.authors?.[0]?.split(' ')[0] || 'Unknown';
          const label = `${firstAuthor} (${article.year || '?'})`;
          const pubmedCitedBy = article.cited_by_pmids?.length || 0;
          const europePMCCitations = article.raw_json?.europePMCCitations || 0;
          const citedByCount = Math.max(pubmedCitedBy, europePMCCitations);
          
          nodes.push({
            id: article.id,
            label,
            title: article.title_en || null,
            year: article.year,
            status: 'citing', // Особый статус для цитирующих статей
            doi: article.doi,
            pmid: article.pmid,
            citedByCount,
            graphLevel: 0, // Уровень 0 - цитируют нас
            statsQuality: article.stats_quality || 0,
          });
          addedNodeIds.add(article.id);
          
          if (article.doi) {
            doiToId.set(article.doi.toLowerCase(), article.id);
          }
          if (article.pmid) {
            pmidToId.set(article.pmid, article.id);
          }
        }
        
        // Добавляем узлы для PMIDs которых нет в БД (показываем как "неизвестные")
        for (const pmid of level0NotInDb) {
          const nodeId = `pmid:${pmid}`; // Используем специальный ID
          if (addedNodeIds.has(nodeId)) continue;
          
          nodes.push({
            id: nodeId,
            label: `PMID:${pmid}`,
            title: null,
            year: null,
            status: 'citing',
            doi: null,
            pmid: pmid,
            citedByCount: 0,
            graphLevel: 0,
            statsQuality: 0,
          });
          addedNodeIds.add(nodeId);
          pmidToId.set(pmid, nodeId);
        }
      }
      
      // ===== УРОВЕНЬ 3: Статьи, которые тоже ссылаются на level 2 (связанные работы) =====
      // Это статьи, которые цитируют те же references что и мы - т.е. похожие исследования
      const level3InDb = new Map<string, any>();
      const level3NotInDb = new Set<string>();
      
      // Level 3 работает с лимитами для производительности
      if (depth >= 3 && level2Articles.length > 0 && canAddMore()) {
        // Собираем PMIDs статей, которые цитируют наши references (level 2)
        for (const level2Article of level2Articles) {
          const citedByPmids = level2Article.cited_by_pmids || [];
          for (const citingPmid of citedByPmids) {
            // Исключаем статьи которые уже в графе
            if (!pmidToId.has(citingPmid) && !level0Pmids.has(citingPmid)) {
              level3Pmids.add(citingPmid);
            }
          }
        }
        
        // Ограничиваем количество для производительности
        const remainingSlotsL3 = Math.max(0, maxTotalNodes - currentNodeCount());
        const level3PmidsArr = Array.from(level3Pmids).slice(0, Math.min(200, remainingSlotsL3));
        
        if (level3PmidsArr.length > 0) {
          // Строим условия фильтрации для уровня 3
          let level3YearCondition = '';
          let level3StatsCondition = '';
          const level3Params: any[] = [level3PmidsArr];
          let level3ParamIdx = 2;
          
          if (yearFrom !== undefined && !isNaN(yearFrom)) {
            level3Params.push(yearFrom);
            level3YearCondition += ` AND year >= $${level3ParamIdx++}`;
          }
          if (yearTo !== undefined && !isNaN(yearTo)) {
            level3Params.push(yearTo);
            level3YearCondition += ` AND year <= $${level3ParamIdx++}`;
          }
          if (hasStatsQuality && statsQuality !== undefined && !isNaN(statsQuality) && statsQuality > 0) {
            level3Params.push(statsQuality);
            level3StatsCondition = ` AND COALESCE(stats_quality, 0) >= $${level3ParamIdx++}`;
          }
          
          const level3Res = await pool.query(
            `SELECT id, doi, pmid, title_en, authors, year, raw_json,
                    ${hasRefColumns ? 'reference_pmids, cited_by_pmids,' : "ARRAY[]::text[] as reference_pmids, ARRAY[]::text[] as cited_by_pmids,"}
                    ${hasStatsQuality ? 'COALESCE(stats_quality, 0) as stats_quality' : '0 as stats_quality'}
             FROM articles 
             WHERE pmid = ANY($1)${level3YearCondition}${level3StatsCondition}`,
            level3Params
          );
          
          level3Articles = level3Res.rows;
          
          for (const article of level3Res.rows) {
            level3InDb.set(article.pmid, article);
          }
          
          // Определяем какие PMIDs не в БД
          const hasFilters = (yearFrom !== undefined) || (yearTo !== undefined) || 
                            (statsQuality !== undefined && statsQuality > 0);
          if (!hasFilters) {
            for (const pmid of level3PmidsArr) {
              if (!level3InDb.has(pmid)) {
                level3NotInDb.add(pmid);
              }
            }
          }
          
          // Добавляем узлы для статей уровня 3 из БД
          for (const article of level3Res.rows) {
            if (addedNodeIds.has(article.id)) continue;
            
            const firstAuthor = article.authors?.[0]?.split(' ')[0] || 'Unknown';
            const label = `${firstAuthor} (${article.year || '?'})`;
            const pubmedCitedBy = article.cited_by_pmids?.length || 0;
            const europePMCCitations = article.raw_json?.europePMCCitations || 0;
            const citedByCount = Math.max(pubmedCitedBy, europePMCCitations);
            
            nodes.push({
              id: article.id,
              label,
              title: article.title_en || null,
              year: article.year,
              status: 'related', // Связанная работа
              doi: article.doi,
              pmid: article.pmid,
              citedByCount,
              graphLevel: 3,
              statsQuality: article.stats_quality || 0,
            });
            addedNodeIds.add(article.id);
            
            if (article.doi) {
              doiToId.set(article.doi.toLowerCase(), article.id);
            }
            if (article.pmid) {
              pmidToId.set(article.pmid, article.id);
            }
          }
          
          // Добавляем узлы для PMIDs которых нет в БД
          for (const pmid of level3NotInDb) {
            const nodeId = `pmid:${pmid}`;
            if (addedNodeIds.has(nodeId)) continue;
            
            nodes.push({
              id: nodeId,
              label: `PMID:${pmid}`,
              title: null,
              year: null,
              status: 'related',
              doi: null,
              pmid: pmid,
              citedByCount: 0,
              graphLevel: 3,
              statsQuality: 0,
            });
            addedNodeIds.add(nodeId);
            pmidToId.set(pmid, nodeId);
          }
        }
      }
      
      // ===== ЕДИНАЯ ЛОГИКА СОЗДАНИЯ ВСЕХ СВЯЗЕЙ =====
      // Собираем все статьи (все уровни) для обработки связей
      const allArticles = [
        ...articlesRes.rows,        // уровень 1
        ...level0Articles,           // уровень 0 (citing)
        ...level2Articles,           // уровень 2
        ...level3Articles,           // уровень 3 (related)
      ];

      // Функция для добавления связи
      const addLink = (sourceId: string, targetId: string) => {
        if (!sourceId || !targetId || sourceId === targetId) return;
        if (!addedNodeIds.has(sourceId) || !addedNodeIds.has(targetId)) return;
        
        const linkKey = `${sourceId}->${targetId}`;
        if (!linksSet.has(linkKey)) {
          linksSet.add(linkKey);
          links.push({ source: sourceId, target: targetId });
        }
      };

      // Debug: Log reference data for project articles
      let totalRefPmids = 0;
      let articlesWithRefs = 0;
      let matchedInternalRefs = 0;
      const projectPmids = new Set(pmidToId.keys());
      
      // Обрабатываем все статьи для создания связей на основе PubMed данных
      for (const article of allArticles) {
        // PostgreSQL returns arrays as arrays, but let's handle edge cases
        let refPmids: string[] = [];
        let citedByPmids: string[] = [];
        
        // Handle reference_pmids - might be array, string, or null
        if (Array.isArray(article.reference_pmids)) {
          refPmids = article.reference_pmids;
        } else if (typeof article.reference_pmids === 'string') {
          // PostgreSQL array might be returned as string like "{pmid1,pmid2}"
          try {
            if (article.reference_pmids.startsWith('{')) {
              refPmids = article.reference_pmids.slice(1, -1).split(',').filter(Boolean);
            } else {
              refPmids = JSON.parse(article.reference_pmids);
            }
          } catch {
            refPmids = [];
          }
        }
        
        // Handle cited_by_pmids similarly
        if (Array.isArray(article.cited_by_pmids)) {
          citedByPmids = article.cited_by_pmids;
        } else if (typeof article.cited_by_pmids === 'string') {
          try {
            if (article.cited_by_pmids.startsWith('{')) {
              citedByPmids = article.cited_by_pmids.slice(1, -1).split(',').filter(Boolean);
            } else {
              citedByPmids = JSON.parse(article.cited_by_pmids);
            }
          } catch {
            citedByPmids = [];
          }
        }
        
        // Count for debugging
        if (refPmids.length > 0) {
          articlesWithRefs++;
          totalRefPmids += refPmids.length;
        }
        
        // Исходящие связи (эта статья ссылается на другие статьи)
        for (const refPmid of refPmids) {
          const targetId = pmidToId.get(refPmid);
          if (targetId) {
            matchedInternalRefs++;
            addLink(article.id, targetId);
          }
        }
        
        // Входящие связи от других статей (цитирующие)
        for (const citingPmid of citedByPmids) {
          const sourceId = pmidToId.get(citingPmid);
          if (sourceId) {
            addLink(sourceId, article.id);
          }
        }
      }
      
      // Log debug info
      console.log(`[CitationGraph] Project has ${projectPmids.size} articles with PMIDs`);
      console.log(`[CitationGraph] Found ${articlesWithRefs} articles with reference_pmids (${totalRefPmids} total refs)`);
      console.log(`[CitationGraph] Matched ${matchedInternalRefs} internal references (links between project articles)`);
      console.log(`[CitationGraph] Created ${links.length} links`)

      // Добавляем связи на основе references из Crossref (для всех статей уровня 1)
      for (const article of articlesRes.rows) {
        const crossrefData = article.raw_json?.crossref;
        const references = crossrefData?.references || crossrefData?.reference || [];
        
        if (!Array.isArray(references) || references.length === 0) continue;

        for (const ref of references) {
          const refDoi = ref.DOI || ref.doi || ref['unstructured']?.match(/10\.\d{4,}\/[^\s]+/)?.[0];
          if (!refDoi) continue;

          const targetId = doiToId.get(refDoi.toLowerCase());
          if (targetId) {
            addLink(article.id, targetId);
          }
        }
      }

      // Получаем уникальные source_queries для фильтра
      let availableQueries: string[] = [];
      if (hasSourceQueryCol) {
        const queriesRes = await pool.query(
          `SELECT DISTINCT pa.source_query 
           FROM project_articles pa 
           WHERE pa.project_id = $1 AND pa.source_query IS NOT NULL AND pa.source_query != ''
           ORDER BY pa.source_query`,
          [paramsP.data.projectId]
        );
        availableQueries = queriesRes.rows.map((r: { source_query: string }) => r.source_query);
      }

      // Получаем диапазон годов для фильтра
      const yearsRes = await pool.query(
        `SELECT MIN(a.year) as min_year, MAX(a.year) as max_year
         FROM project_articles pa
         JOIN articles a ON a.id = pa.article_id
         WHERE pa.project_id = $1 AND a.year IS NOT NULL`,
        [paramsP.data.projectId]
      );
      const yearRange = {
        min: yearsRes.rows[0]?.min_year || null,
        max: yearsRes.rows[0]?.max_year || null,
      };

      // Подсчёт статей по уровням
      const levelCounts = {
        level0: nodes.filter(n => n.graphLevel === 0).length, // Цитирующие нас
        level1: nodes.filter(n => n.graphLevel === 1).length, // В проекте
        level2: nodes.filter(n => n.graphLevel === 2).length, // References
        level3: nodes.filter(n => n.graphLevel === 3).length, // Связанные
      };
      
      // Note: totalRefPmids and articlesWithRefs are now calculated above in the link creation loop

      // Автоматическое обогащение узлов, которых нет в БД (pmid:xxxxx)
      // Загружаем полную информацию из PubMed для отображения в sidebar
      const placeholderPmids = nodes
        .filter((n) => typeof n.id === 'string' && n.id.startsWith('pmid:') && typeof n.pmid === 'string' && n.pmid)
        .map((n) => String(n.pmid));

      const uniquePlaceholderPmids = Array.from(new Set(placeholderPmids)).slice(0, 150); // Увеличили лимит до 150
      if (uniquePlaceholderPmids.length > 0) {
        try {
          const fetched = await pubmedFetchByPmids({
            pmids: uniquePlaceholderPmids,
            throttleMs: 200,
          });

          const byPmid = new Map(fetched.map((a) => [a.pmid, a] as const));
          for (const n of nodes) {
            if (!n.id.startsWith('pmid:') || !n.pmid) continue;
            const a = byPmid.get(n.pmid);
            if (!a) continue;

            const firstAuthor = (a.authors || '').split(',')[0]?.split(' ')[0]?.trim() || 'Unknown';
            const year = a.year ?? null;
            n.year = year;
            n.doi = a.doi ?? n.doi;
            n.title = a.title ?? null; // Добавляем полное название
            n.label = `${firstAuthor} (${year || '?'})`;
          }
        } catch (err) {
          // не падаем, если PubMed недоступен/лимит
          console.error('Citation graph enrichment (PubMed) error:', err);
        }
      }

      return {
        nodes,
        links,
        stats: {
          totalNodes: nodes.length,
          totalLinks: links.length,
          levelCounts,
          // Информация о доступных ссылках для расширения графа
          availableReferences: totalRefPmids,
          availableCiting: 0, // Будет добавлено позже
          // Отладочная информация
          articlesWithRefs,
          matchedInternalRefs,
        },
        availableQueries,
        yearRange,
        currentDepth: depth,
        limits: { maxLinksPerNode, maxTotalNodes },
      };
    }
  );
};

export default plugin;
