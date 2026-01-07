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
  // Реализует умную нумерацию:
  // - Минимальный свободный номер для нового источника
  // - Переиспользование освободившихся номеров
  // - Sub-number для множественных цитат одного источника
  // - ДЕДУПЛИКАЦИЯ: статьи с одинаковым PMID/DOI получают один номер
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

      // Получаем PMID и DOI добавляемой статьи для дедупликации
      const articleInfo = await pool.query(
        `SELECT pmid, doi, title_en FROM articles WHERE id = $1`,
        [bodyP.data.articleId]
      );
      
      const articlePmid = articleInfo.rows[0]?.pmid;
      const articleDoi = articleInfo.rows[0]?.doi;
      const articleTitle = articleInfo.rows[0]?.title_en;

      // Проверяем, есть ли уже цитаты на этот источник (по article_id)
      let existingCitations = await pool.query(
        `SELECT inline_number, sub_number FROM citations 
         WHERE document_id = $1 AND article_id = $2 
         ORDER BY sub_number`,
        [paramsP.data.docId, bodyP.data.articleId]
      );

      let inlineNumber: number;
      let subNumber = 1;

      // Если нет цитат с этим article_id, проверяем дубликаты по PMID/DOI
      if ((existingCitations.rowCount ?? 0) === 0 && (articlePmid || articleDoi)) {
        // Ищем цитаты на статьи-дубликаты (с таким же PMID или DOI)
        const duplicateQuery = `
          SELECT c.inline_number, c.sub_number, c.article_id
          FROM citations c
          JOIN articles a ON a.id = c.article_id
          WHERE c.document_id = $1 
            AND c.article_id != $2
            AND (
              (a.pmid IS NOT NULL AND a.pmid = $3)
              OR (a.doi IS NOT NULL AND LOWER(a.doi) = LOWER($4))
            )
          ORDER BY c.inline_number, c.sub_number
        `;
        const duplicateCitations = await pool.query(duplicateQuery, [
          paramsP.data.docId,
          bodyP.data.articleId,
          articlePmid || '',
          articleDoi || ''
        ]);
        
        if ((duplicateCitations.rowCount ?? 0) > 0) {
          // Нашли дубликат - используем тот же inline_number
          existingCitations = duplicateCitations;
        }
      }

      if ((existingCitations.rowCount ?? 0) > 0) {
        // Есть существующие цитаты этого источника (или дубликата) - используем тот же inline_number
        inlineNumber = existingCitations.rows[0].inline_number;
        
        // Найти минимальный свободный sub_number (переиспользуем освободившиеся номера)
        const usedSubNumbers = new Set(existingCitations.rows.map((r: any) => r.sub_number || 1));
        subNumber = 1;
        while (usedSubNumbers.has(subNumber)) {
          subNumber++;
        }
      } else {
        // Новый источник - найти минимальный свободный inline_number
        // Это обеспечивает компактную нумерацию без пропусков
        const usedInlineNumbers = await pool.query(
          `SELECT DISTINCT inline_number FROM citations WHERE document_id = $1 ORDER BY inline_number`,
          [paramsP.data.docId]
        );
        const usedNumbers = new Set(usedInlineNumbers.rows.map((r: any) => r.inline_number));
        inlineNumber = 1;
        while (usedNumbers.has(inlineNumber)) {
          inlineNumber++;
        }
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
  // Реализует умную перенумерацию после удаления:
  // - Если удаляется последняя цитата источника, освобождается номер
  // - Если после удалённого номера были источники, они сдвигаются
  // - Sub_number пересчитываются последовательно (1, 2, 3...)
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

      // Получаем информацию об удаляемой цитате
      const citationToDelete = await pool.query(
        `SELECT article_id, inline_number FROM citations WHERE id = $1 AND document_id = $2`,
        [paramsP.data.citationId, paramsP.data.docId]
      );
      
      if (citationToDelete.rowCount === 0) {
        return reply.code(404).send({ error: "Citation not found" });
      }
      
      const articleId = citationToDelete.rows[0].article_id;
      const deletedInlineNumber = citationToDelete.rows[0].inline_number;
      
      // Удаляем цитату
      await pool.query(
        `DELETE FROM citations WHERE id = $1 AND document_id = $2`,
        [paramsP.data.citationId, paramsP.data.docId]
      );

      // Проверяем, остались ли ещё цитаты этого источника
      const remainingForArticle = await pool.query(
        `SELECT COUNT(*) as count FROM citations WHERE document_id = $1 AND article_id = $2`,
        [paramsP.data.docId, articleId]
      );
      
      const articleHasMoreCitations = parseInt(remainingForArticle.rows[0].count) > 0;

      if (articleHasMoreCitations) {
        // Есть ещё цитаты этого источника - только пересчитываем sub_number (1, 2, 3...)
        await pool.query(
          `WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY order_index) as new_sub
            FROM citations WHERE document_id = $1 AND article_id = $2
          )
          UPDATE citations c
          SET sub_number = n.new_sub
          FROM numbered n
          WHERE c.id = n.id`,
          [paramsP.data.docId, articleId]
        );
      } else {
        // Удалена последняя цитата источника - нужно проверить, есть ли источники после
        // и если есть, сдвинуть их номера на -1
        const sourcesAfter = await pool.query(
          `SELECT DISTINCT article_id FROM citations 
           WHERE document_id = $1 AND inline_number > $2`,
          [paramsP.data.docId, deletedInlineNumber]
        );
        
        if ((sourcesAfter.rowCount ?? 0) > 0) {
          // Есть источники после - сдвигаем все номера > deletedInlineNumber на -1
          await pool.query(
            `UPDATE citations 
             SET inline_number = inline_number - 1 
             WHERE document_id = $1 AND inline_number > $2`,
            [paramsP.data.docId, deletedInlineNumber]
          );
        }
        // Если источников после нет, номер просто освобождается
        // и будет переиспользован при следующей вставке
      }

      // Обновляем order_index для последовательности
      await pool.query(
        `WITH numbered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY order_index) - 1 as new_order
          FROM citations WHERE document_id = $1
        )
        UPDATE citations c
        SET order_index = n.new_order
        FROM numbered n
        WHERE c.id = n.id`,
        [paramsP.data.docId]
      );

      return { ok: true };
    }
  );

  // POST /api/projects/:projectId/documents/:docId/sync-citations
  // Синхронизирует цитаты в БД с текущим HTML контентом документа
  // - Удаляет цитаты, которых больше нет в тексте
  // - ОБЪЕДИНЯЕТ дубликаты (статьи с одинаковым PMID/DOI получают один номер)
  // Возвращает обновлённый документ с перенумерованными цитатами
  fastify.post(
    "/projects/:projectId/documents/:docId/sync-citations",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request as any).user.sub;

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const bodySchema = z.object({
        citationIds: z.array(z.string().uuid()), // ID цитат, которые есть в HTML
      });

      const bodyP = bodySchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      const { docId, projectId } = paramsP.data;
      const citationIdsInHtml = new Set(bodyP.data.citationIds);

      // Получаем все цитаты документа из БД
      const existingCitations = await pool.query(
        `SELECT id FROM citations WHERE document_id = $1`,
        [docId]
      );

      // Находим цитаты для удаления (есть в БД, но нет в HTML)
      const toDelete: string[] = [];
      for (const row of existingCitations.rows) {
        if (!citationIdsInHtml.has(row.id)) {
          toDelete.push(row.id);
        }
      }

      // Удаляем цитаты
      if (toDelete.length > 0) {
        await pool.query(
          `DELETE FROM citations WHERE id = ANY($1) AND document_id = $2`,
          [toDelete, docId]
        );
      }

      // =======================================================================
      // ДЕДУПЛИКАЦИЯ: объединяем цитаты на статьи с одинаковым PMID/DOI
      // Все цитаты одной "логической" статьи должны иметь один inline_number
      // =======================================================================
      
      // Получаем все цитаты с данными статей для дедупликации
      const citationsWithArticles = await pool.query(
        `SELECT c.id, c.article_id, c.order_index, a.pmid, a.doi, a.title_en
         FROM citations c
         JOIN articles a ON a.id = c.article_id
         WHERE c.document_id = $1
         ORDER BY c.order_index`,
        [docId]
      );

      // Создаём группы статей-дубликатов по ключу дедупликации (PMID > DOI > title)
      const getDedupeKey = (row: any): string => {
        if (row.pmid) return `pmid:${row.pmid}`;
        if (row.doi) return `doi:${row.doi.toLowerCase()}`;
        if (row.title_en) return `title:${row.title_en.toLowerCase().replace(/[^\w\s]/g, '').trim()}`;
        return `id:${row.article_id}`;
      };

      // Группируем по ключу дедупликации, сохраняем порядок первого появления
      const dedupeKeyToNumber = new Map<string, number>(); // ключ -> inline_number
      const dedupeKeyOrder: string[] = []; // порядок первого появления
      
      for (const row of citationsWithArticles.rows) {
        const key = getDedupeKey(row);
        if (!dedupeKeyToNumber.has(key)) {
          dedupeKeyOrder.push(key);
        }
      }

      // Присваиваем номера в порядке первого появления
      dedupeKeyOrder.forEach((key, index) => {
        dedupeKeyToNumber.set(key, index + 1);
      });

      // Обновляем inline_number для всех цитат согласно дедупликации
      for (const row of citationsWithArticles.rows) {
        const key = getDedupeKey(row);
        const newInlineNumber = dedupeKeyToNumber.get(key);
        if (newInlineNumber !== undefined) {
          await pool.query(
            `UPDATE citations SET inline_number = $1 WHERE id = $2`,
            [newInlineNumber, row.id]
          );
        }
      }

      // Перенумеровываем sub_number для каждой группы дедупликации
      // (группируем по ключу, а не по article_id)
      const citationsByDedupeKey = new Map<string, any[]>();
      for (const row of citationsWithArticles.rows) {
        const key = getDedupeKey(row);
        if (!citationsByDedupeKey.has(key)) {
          citationsByDedupeKey.set(key, []);
        }
        citationsByDedupeKey.get(key)!.push(row);
      }

      for (const [, citations] of citationsByDedupeKey) {
        // Сортируем по order_index и присваиваем sub_number
        citations.sort((a, b) => a.order_index - b.order_index);
        for (let i = 0; i < citations.length; i++) {
          await pool.query(
            `UPDATE citations SET sub_number = $1 WHERE id = $2`,
            [i + 1, citations[i].id]
          );
        }
      }

      // Обновляем order_index для последовательности
      await pool.query(
        `WITH numbered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY order_index) - 1 as new_order
          FROM citations WHERE document_id = $1
        )
        UPDATE citations c
        SET order_index = n.new_order
        FROM numbered n
        WHERE c.id = n.id`,
        [docId]
      );

      // Возвращаем обновлённый документ с цитатами
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
        [docId, projectId]
      );

      return {
        ok: true,
        deleted: toDelete.length,
        document: res.rows[0],
      };
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

      // =======================================================================
      // ЛОГИКА ОБЪЕДИНЕНИЯ ДУБЛИКАТОВ ПРИ ЭКСПОРТЕ
      // =======================================================================
      // 1. Получаем ВСЕ цитаты с полными данными статей
      // 2. Определяем "ключ дедупликации" для каждой статьи (PMID > DOI > title_en)
      // 3. Группируем по ключу, выбираем первое появление (по order_index документа + inline_number)
      // 4. Создаём маппинг: article_id -> глобальный номер (с учётом дубликатов)
      // =======================================================================
      
      const allCitationsRes = await pool.query(
        hasVolumeColumns
          ? `SELECT c.id as citation_id, c.document_id, c.article_id, c.inline_number,
                    d.order_index as doc_order,
                    a.id, a.title_en, a.title_ru, a.authors, a.year, a.journal,
                    a.doi, a.pmid,
                    COALESCE(a.volume, a.raw_json->'crossref'->>'volume') as volume,
                    COALESCE(a.issue, a.raw_json->'crossref'->>'issue') as issue,
                    COALESCE(a.pages, a.raw_json->'crossref'->>'pages') as pages
             FROM citations c
             JOIN documents d ON d.id = c.document_id
             JOIN articles a ON a.id = c.article_id
             WHERE d.project_id = $1
             ORDER BY d.order_index, c.inline_number`
          : `SELECT c.id as citation_id, c.document_id, c.article_id, c.inline_number,
                    d.order_index as doc_order,
                    a.id, a.title_en, a.title_ru, a.authors, a.year, a.journal,
                    a.doi, a.pmid,
                    (a.raw_json->'crossref'->>'volume') as volume,
                    (a.raw_json->'crossref'->>'issue') as issue,
                    (a.raw_json->'crossref'->>'pages') as pages
             FROM citations c
             JOIN documents d ON d.id = c.document_id
             JOIN articles a ON a.id = c.article_id
             WHERE d.project_id = $1
             ORDER BY d.order_index, c.inline_number`,
        [paramsP.data.projectId]
      );

      // Функция для получения ключа дедупликации
      // Приоритет: PMID > базовый DOI (без версий) > нормализованный title
      const getDedupeKey = (article: any): string => {
        if (article.pmid) {
          return `pmid:${article.pmid}`;
        }
        if (article.doi) {
          // Нормализуем DOI: убираем версии типа /v1/review2, /v2/decision1 и т.д.
          const baseDoi = article.doi.replace(/\/v\d+\/.*$/, '').toLowerCase();
          return `doi:${baseDoi}`;
        }
        if (article.title_en) {
          // Нормализуем title: lowercase, убираем пунктуацию
          const normalizedTitle = article.title_en.toLowerCase().replace(/[^\w\s]/g, '').trim();
          return `title:${normalizedTitle}`;
        }
        // Fallback на article_id
        return `id:${article.id}`;
      };

      // Группируем статьи по ключу дедупликации
      // Сохраняем первое появление (по порядку документов и inline_number)
      const dedupeKeyToArticle = new Map<string, any>(); // ключ -> данные статьи (первое появление)
      const dedupeKeyOrder: string[] = []; // порядок первого появления ключей
      const articleIdToDedupeKey = new Map<string, string>(); // article_id -> ключ дедупликации

      for (const citation of allCitationsRes.rows) {
        const dedupeKey = getDedupeKey(citation);
        articleIdToDedupeKey.set(citation.article_id, dedupeKey);
        
        if (!dedupeKeyToArticle.has(dedupeKey)) {
          // Первое появление этого источника
          dedupeKeyToArticle.set(dedupeKey, citation);
          dedupeKeyOrder.push(dedupeKey);
        }
      }

      // Создаём библиографию из уникальных источников
      const bibliography: { number: number; articleId: string; formatted: string }[] = [];
      const dedupeKeyToNumber = new Map<string, number>(); // ключ дедупликации -> глобальный номер

      dedupeKeyOrder.forEach((dedupeKey, index) => {
        const article = dedupeKeyToArticle.get(dedupeKey)!;
        const globalNumber = index + 1;
        dedupeKeyToNumber.set(dedupeKey, globalNumber);
        
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
        
        bibliography.push({
          number: globalNumber,
          articleId: article.id,
          formatted: formatCitation(bibArticle, citationStyle),
        });
      });

      // Создаём маппинг (document_id, inline_number) -> новый глобальный номер
      // Используем ключ дедупликации для определения номера
      const citationMapping = new Map<string, number>();
      for (const citation of allCitationsRes.rows) {
        const key = `${citation.document_id}:${citation.inline_number}`;
        const dedupeKey = articleIdToDedupeKey.get(citation.article_id);
        if (dedupeKey) {
          const globalNum = dedupeKeyToNumber.get(dedupeKey);
          if (globalNum !== undefined) {
            citationMapping.set(key, globalNum);
          }
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
        
        // Заменяем data-citation-number и текст [n] в span элементах
        content = content.replace(
          /<span[^>]*class="citation-ref"[^>]*data-citation-number="(\d+)"[^>]*>\[(\d+)\]<\/span>/g,
          (match: string, attrNum: string, textNum: string) => {
            const key = `${doc.id}:${attrNum}`;
            const globalNum = citationMapping.get(key);
            if (globalNum !== undefined) {
              return match
                .replace(`data-citation-number="${attrNum}"`, `data-citation-number="${globalNum}"`)
                .replace(`[${textNum}]`, `[${globalNum}]`);
            }
            return match;
          }
        );
        
        // Также обрабатываем обратный порядок атрибутов (data-citation-number перед class)
        content = content.replace(
          /<span[^>]*data-citation-number="(\d+)"[^>]*class="citation-ref"[^>]*>\[(\d+)\]<\/span>/g,
          (match: string, attrNum: string, textNum: string) => {
            const key = `${doc.id}:${attrNum}`;
            const globalNum = citationMapping.get(key);
            if (globalNum !== undefined) {
              return match
                .replace(`data-citation-number="${attrNum}"`, `data-citation-number="${globalNum}"`)
                .replace(`[${textNum}]`, `[${globalNum}]`);
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

      // =======================================================================
      // ЛОГИКА ОБЪЕДИНЕНИЯ ДУБЛИКАТОВ
      // =======================================================================
      // 1. Получаем ВСЕ цитаты с полными данными статей (отсортированные по порядку появления)
      // 2. Определяем "ключ дедупликации" для каждой статьи (PMID > DOI > title_en)
      // 3. Группируем по ключу, выбираем первое появление
      // =======================================================================
      
      const allCitationsRes = await pool.query(
        hasVolumeColumns
          ? `SELECT c.article_id, d.order_index as doc_order, c.inline_number,
                    a.id, a.title_en, a.title_ru, a.authors, a.year, a.journal,
                    a.doi, a.pmid, a.volume, a.issue, a.pages
             FROM citations c
             JOIN documents d ON d.id = c.document_id
             JOIN articles a ON a.id = c.article_id
             WHERE d.project_id = $1
             ORDER BY d.order_index, c.inline_number`
          : `SELECT c.article_id, d.order_index as doc_order, c.inline_number,
                    a.id, a.title_en, a.title_ru, a.authors, a.year, a.journal,
                    a.doi, a.pmid,
                    NULL as volume, NULL as issue, NULL as pages
             FROM citations c
             JOIN documents d ON d.id = c.document_id
             JOIN articles a ON a.id = c.article_id
             WHERE d.project_id = $1
             ORDER BY d.order_index, c.inline_number`,
        [paramsP.data.projectId]
      );

      // Функция для получения ключа дедупликации
      // Приоритет: PMID > базовый DOI (без версий) > нормализованный title
      const getDedupeKey = (article: any): string => {
        if (article.pmid) {
          return `pmid:${article.pmid}`;
        }
        if (article.doi) {
          // Нормализуем DOI: убираем версии типа /v1/review2, /v2/decision1 и т.д.
          const baseDoi = article.doi.replace(/\/v\d+\/.*$/, '').toLowerCase();
          return `doi:${baseDoi}`;
        }
        if (article.title_en) {
          // Нормализуем title: lowercase, убираем пунктуацию
          const normalizedTitle = article.title_en.toLowerCase().replace(/[^\w\s]/g, '').trim();
          return `title:${normalizedTitle}`;
        }
        // Fallback на article_id
        return `id:${article.id}`;
      };

      // Группируем статьи по ключу дедупликации
      const dedupeKeyToArticle = new Map<string, any>();
      const dedupeKeyOrder: string[] = [];

      for (const citation of allCitationsRes.rows) {
        const dedupeKey = getDedupeKey(citation);
        
        if (!dedupeKeyToArticle.has(dedupeKey)) {
          dedupeKeyToArticle.set(dedupeKey, citation);
          dedupeKeyOrder.push(dedupeKey);
        }
      }

      // Создаём библиографию из уникальных источников
      const bibliography = dedupeKeyOrder.map((dedupeKey, index) => {
        const article = dedupeKeyToArticle.get(dedupeKey)!;
        
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
        sources?: string; // Фильтр по источнику (pubmed, doaj, wiley)
      };
      
      // Mega режим отключён - всегда используем lite с лимитами
      const filter = query.filter || 'all';
      const depth = Math.min(3, Math.max(1, parseInt(query.depth || '1', 10) || 1));
      const yearFrom = query.yearFrom ? parseInt(query.yearFrom, 10) : undefined;
      const yearTo = query.yearTo ? parseInt(query.yearTo, 10) : undefined;
      const statsQuality = query.statsQuality ? parseInt(query.statsQuality, 10) : undefined;
      
      // Лимиты для графа (mega режим отключён)
      // maxLinksPerNode - количество связей на узел для уровней 2/3
      // maxTotalNodes - лимит для ДОПОЛНИТЕЛЬНЫХ узлов (уровни 0, 2, 3), 
      //                 статьи проекта (уровень 1) всегда включаются
      const maxLinksPerNode = Math.min(50, Math.max(1, parseInt(query.maxLinksPerNode || '10', 10) || 10));
      const maxExtraNodes = Math.min(2000, Math.max(10, parseInt(query.maxTotalNodes || '1000', 10) || 1000));
      
      let sourceQueries: string[] = [];
      if (query.sourceQueries) {
        try {
          sourceQueries = JSON.parse(query.sourceQueries);
        } catch {
          sourceQueries = [];
        }
      }
      
      // Фильтр по источнику статьи (pubmed, doaj, wiley)
      let sourcesFilter: string[] = [];
      if (query.sources) {
        try {
          sourcesFilter = JSON.parse(query.sources);
          // Валидация источников
          const validSources = ['pubmed', 'doaj', 'wiley'];
          sourcesFilter = sourcesFilter.filter(s => validSources.includes(s));
        } catch {
          sourcesFilter = [];
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
      
      // Условие по источнику статьи (pubmed, doaj, wiley)
      let sourcesCondition = '';
      if (sourcesFilter.length > 0) {
        queryParams.push(sourcesFilter);
        sourcesCondition = ` AND COALESCE(a.source, 'pubmed') = ANY($${paramIdx++})`;
      }

      // Получить все статьи проекта (Уровень 1) с их данными о references
      // Включаем references_fetched_at для определения уже проанализированных статей
      // Добавляем abstract_en, abstract_ru, title_ru, journal, source для полноценного отображения
      const articlesRes = await pool.query(
        hasRefColumns
          ? `SELECT a.id, a.doi, a.pmid, a.title_en, a.title_ru, a.abstract_en, a.abstract_ru,
                    a.authors, a.year, a.journal, a.source,
                    a.raw_json, a.reference_pmids, a.cited_by_pmids, a.references_fetched_at,
                    ${hasStatsQuality ? 'COALESCE(a.stats_quality, 0) as stats_quality,' : '0 as stats_quality,'}
                    pa.status${hasSourceQueryCol ? ', pa.source_query' : ''},
                    1 as graph_level
             FROM project_articles pa
             JOIN articles a ON a.id = pa.article_id
             WHERE pa.project_id = $1${statusCondition}${sourceQueryCondition}${yearCondition}${statsCondition}${sourcesCondition}`
          : `SELECT a.id, a.doi, a.pmid, a.title_en, a.title_ru, a.abstract_en, a.abstract_ru,
                    a.authors, a.year, a.journal, a.source,
                    a.raw_json, 
                    ARRAY[]::text[] as reference_pmids, 
                    ARRAY[]::text[] as cited_by_pmids,
                    NULL as references_fetched_at,
                    ${hasStatsQuality ? 'COALESCE(a.stats_quality, 0) as stats_quality,' : '0 as stats_quality,'}
                    pa.status${hasSourceQueryCol ? ', pa.source_query' : ''},
                    1 as graph_level
             FROM project_articles pa
             JOIN articles a ON a.id = pa.article_id
             WHERE pa.project_id = $1${statusCondition}${sourceQueryCondition}${yearCondition}${statsCondition}${sourcesCondition}`,
        queryParams
      );

      // Строим nodes и links
      type GraphNodeInternal = {
        id: string;
        label: string;
        title: string | null;
        title_ru: string | null;
        abstract: string | null;
        abstract_ru: string | null;
        authors: string | null;
        journal: string | null;
        year: number | null;
        status: string;
        doi: string | null;
        pmid: string | null;
        citedByCount: number;
        graphLevel: number;
        statsQuality: number;
        source?: string; // 'pubmed' | 'doaj' | 'wiley' | 'crossref'
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
        
        // Форматируем авторов (может быть массивом или строкой)
        const authorsStr = Array.isArray(article.authors) 
          ? article.authors.join(', ') 
          : article.authors || null;
        
        nodes.push({
          id: article.id,
          label,
          title: article.title_en || null,
          title_ru: article.title_ru || null,
          abstract: article.abstract_en || null,
          abstract_ru: article.abstract_ru || null,
          authors: authorsStr,
          journal: article.journal || null,
          year: article.year,
          status: article.status,
          doi: article.doi,
          pmid: article.pmid,
          citedByCount,
          graphLevel: 1,
          statsQuality: article.stats_quality || 0,
          source: article.source || 'pubmed',
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
      
      // Подсчёт добавленных ДОПОЛНИТЕЛЬНЫХ узлов (уровни 0, 2, 3)
      // Статьи проекта (уровень 1) не учитываются в лимите
      let extraNodesAdded = 0;
      const canAddMore = () => extraNodesAdded < maxExtraNodes;
      
      if (depth >= 2 && level2Pmids.size > 0) {
        // Ограничиваем количество PMIDs для загрузки
        const remainingSlots = Math.max(0, maxExtraNodes - extraNodesAdded);
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
          `SELECT id, doi, pmid, title_en, title_ru, abstract_en, abstract_ru, authors, year, journal, raw_json,
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
          if (!canAddMore()) break; // Проверяем лимит
          
          const authorsArr = article.authors || [];
          const firstAuthor = (Array.isArray(authorsArr) ? authorsArr[0] : authorsArr)?.split?.(' ')?.[0] || 'Unknown';
          const label = `${firstAuthor} (${article.year || '?'})`;
          const pubmedCitedBy = article.cited_by_pmids?.length || 0;
          const europePMCCitations = article.raw_json?.europePMCCitations || 0;
          const citedByCount = Math.max(pubmedCitedBy, europePMCCitations);
          const authorsStr = Array.isArray(authorsArr) ? authorsArr.join(', ') : authorsArr;
          
          nodes.push({
            id: article.id,
            label,
            title: article.title_en || null,
            title_ru: article.title_ru || null,
            abstract: article.abstract_en || null,
            abstract_ru: article.abstract_ru || null,
            authors: authorsStr || null,
            journal: article.journal || null,
            year: article.year,
            status: 'reference', // Особый статус для статей уровня 2
            doi: article.doi,
            pmid: article.pmid,
            citedByCount,
            graphLevel: 2,
            statsQuality: article.stats_quality || 0,
          });
          addedNodeIds.add(article.id);
          extraNodesAdded++;
          
          if (article.doi) {
            doiToId.set(article.doi.toLowerCase(), article.id);
          }
          if (article.pmid) {
            pmidToId.set(article.pmid, article.id);
          }
        }
        
        // Добавляем узлы для PMIDs которых нет в БД (показываем как "неизвестные")
        // Для таких узлов нужно подгрузить данные при клике (см. NodeInfoPanel)
        for (const pmid of level2NotInDb) {
          if (!canAddMore()) break; // Проверяем лимит
          const nodeId = `pmid:${pmid}`; // Используем специальный ID
          if (addedNodeIds.has(nodeId)) continue;
          
          nodes.push({
            id: nodeId,
            label: `PMID:${pmid}`,
            title: null,
            title_ru: null,
            abstract: null,
            abstract_ru: null,
            authors: null,
            journal: null,
            year: null,
            status: 'reference',
            doi: null,
            pmid: pmid,
            citedByCount: 0,
            graphLevel: 2,
            statsQuality: 0,
          });
          addedNodeIds.add(nodeId);
          extraNodesAdded++;
          pmidToId.set(pmid, nodeId);
        }
      }

      // Загружаем статьи уровня 0 (citing articles - те кто цитирует нас) - сначала ищем в БД
      const level0InDb = new Map<string, any>(); // pmid -> article data
      const level0NotInDb = new Set<string>(); // PMIDs не в БД
      
      console.log(`[CitationGraph] Level 0 check: depth=${depth}, level0Pmids.size=${level0Pmids.size}, canAddMore=${canAddMore()}`);
      
      if (depth >= 3 && level0Pmids.size > 0 && canAddMore()) {
        // Ограничиваем количество PMIDs для загрузки
        const remainingSlotsL0 = Math.max(0, maxExtraNodes - extraNodesAdded);
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
          `SELECT id, doi, pmid, title_en, title_ru, abstract_en, abstract_ru, authors, year, journal, raw_json,
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
          if (!canAddMore()) break; // Проверяем лимит
          
          const authorsArr = article.authors || [];
          const firstAuthor = (Array.isArray(authorsArr) ? authorsArr[0] : authorsArr)?.split?.(' ')?.[0] || 'Unknown';
          const label = `${firstAuthor} (${article.year || '?'})`;
          const pubmedCitedBy = article.cited_by_pmids?.length || 0;
          const europePMCCitations = article.raw_json?.europePMCCitations || 0;
          const citedByCount = Math.max(pubmedCitedBy, europePMCCitations);
          const authorsStr = Array.isArray(authorsArr) ? authorsArr.join(', ') : authorsArr;
          
          nodes.push({
            id: article.id,
            label,
            title: article.title_en || null,
            title_ru: article.title_ru || null,
            abstract: article.abstract_en || null,
            abstract_ru: article.abstract_ru || null,
            authors: authorsStr || null,
            journal: article.journal || null,
            year: article.year,
            status: 'citing', // Особый статус для цитирующих статей
            doi: article.doi,
            pmid: article.pmid,
            citedByCount,
            graphLevel: 0, // Уровень 0 - цитируют нас
            statsQuality: article.stats_quality || 0,
          });
          addedNodeIds.add(article.id);
          extraNodesAdded++;
          
          if (article.doi) {
            doiToId.set(article.doi.toLowerCase(), article.id);
          }
          if (article.pmid) {
            pmidToId.set(article.pmid, article.id);
          }
        }
        
        // Добавляем узлы для PMIDs которых нет в БД (показываем как "неизвестные")
        // Данные будут подгружены при клике через NodeInfoPanel
        for (const pmid of level0NotInDb) {
          if (!canAddMore()) break; // Проверяем лимит
          const nodeId = `pmid:${pmid}`; // Используем специальный ID
          if (addedNodeIds.has(nodeId)) continue;
          
          nodes.push({
            id: nodeId,
            label: `PMID:${pmid}`,
            title: null,
            title_ru: null,
            abstract: null,
            abstract_ru: null,
            authors: null,
            journal: null,
            year: null,
            status: 'citing',
            doi: null,
            pmid: pmid,
            citedByCount: 0,
            graphLevel: 0,
            statsQuality: 0,
          });
          addedNodeIds.add(nodeId);
          extraNodesAdded++;
          pmidToId.set(pmid, nodeId);
        }
      }
      
      // ===== УРОВЕНЬ 3: Статьи, которые тоже ссылаются на level 2 (связанные работы) =====
      // Это статьи, которые цитируют те же references что и мы - т.е. похожие исследования
      const level3InDb = new Map<string, any>();
      const level3NotInDb = new Set<string>();
      
      console.log(`[CitationGraph] Level 3 check: depth=${depth}, level2Articles.length=${level2Articles.length}, canAddMore=${canAddMore()}`);
      
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
        const remainingSlotsL3 = Math.max(0, maxExtraNodes - extraNodesAdded);
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
            `SELECT id, doi, pmid, title_en, title_ru, abstract_en, abstract_ru, authors, year, journal, raw_json,
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
            if (!canAddMore()) break; // Проверяем лимит
            
            const authorsArr = article.authors || [];
            const firstAuthor = (Array.isArray(authorsArr) ? authorsArr[0] : authorsArr)?.split?.(' ')?.[0] || 'Unknown';
            const label = `${firstAuthor} (${article.year || '?'})`;
            const pubmedCitedBy = article.cited_by_pmids?.length || 0;
            const europePMCCitations = article.raw_json?.europePMCCitations || 0;
            const citedByCount = Math.max(pubmedCitedBy, europePMCCitations);
            const authorsStr = Array.isArray(authorsArr) ? authorsArr.join(', ') : authorsArr;
            
            nodes.push({
              id: article.id,
              label,
              title: article.title_en || null,
              title_ru: null,
              abstract: article.abstract_en || null,
              abstract_ru: article.abstract_ru || null,
              authors: authorsStr || null,
              journal: article.journal || null,
              year: article.year,
              status: 'related', // Связанная работа
              doi: article.doi,
              pmid: article.pmid,
              citedByCount,
              graphLevel: 3,
              statsQuality: article.stats_quality || 0,
            });
            addedNodeIds.add(article.id);
            extraNodesAdded++;
            
            if (article.doi) {
              doiToId.set(article.doi.toLowerCase(), article.id);
            }
            if (article.pmid) {
              pmidToId.set(article.pmid, article.id);
            }
          }
          
          // Добавляем узлы для PMIDs которых нет в БД
          // Данные будут подгружены при клике через NodeInfoPanel
          for (const pmid of level3NotInDb) {
            if (!canAddMore()) break; // Проверяем лимит
            const nodeId = `pmid:${pmid}`;
            if (addedNodeIds.has(nodeId)) continue;
            
            nodes.push({
              id: nodeId,
              label: `PMID:${pmid}`,
              title: null,
              title_ru: null,
              abstract: null,
              abstract_ru: null,
              authors: null,
              journal: null,
              year: null,
              status: 'related',
              doi: null,
              pmid: pmid,
              citedByCount: 0,
              graphLevel: 3,
              statsQuality: 0,
            });
            addedNodeIds.add(nodeId);
            extraNodesAdded++;
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
      
      console.log(`[CitationGraph] Final levelCounts: L0=${levelCounts.level0}, L1=${levelCounts.level1}, L2=${levelCounts.level2}, L3=${levelCounts.level3}, links=${links.length}`);
      
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
        limits: { maxLinksPerNode, maxExtraNodes },
      };
    }
  );
};

export default plugin;
