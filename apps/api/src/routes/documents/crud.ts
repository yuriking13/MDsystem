import type { FastifyPluginAsync } from "fastify";
import { pool } from "../../pg.js";
import { invalidateDocuments, invalidateDocument } from "../../lib/redis.js";
import { getUserId } from "../../utils/auth-helpers.js";
import {
  ProjectIdSchema,
  DocumentIdSchema,
  CreateDocumentSchema,
  UpdateDocumentSchema,
  ReorderDocumentsSchema,
} from "./types.js";
import { checkProjectAccess, hasSubNumberColumn } from "./helpers.js";

/**
 * Document CRUD operations plugin
 * Handles: list, get, create, update, delete, reorder documents
 */
const crudPlugin: FastifyPluginAsync = async (fastify) => {
  // GET /api/projects/:projectId/documents - список документов
  fastify.get(
    "/projects/:projectId/documents",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

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
        [paramsP.data.projectId],
      );

      return { documents: res.rows };
    },
  );

  // GET /api/projects/:projectId/documents/:docId - один документ
  fastify.get(
    "/projects/:projectId/documents/:docId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId);
      if (!access.ok) {
        return reply.code(404).send({ error: "Project not found" });
      }

      const hasSubNumber = await hasSubNumberColumn();

      const res = await pool.query(
        `SELECT d.*, 
          (SELECT json_agg(json_build_object(
            'id', c.id,
            'article_id', c.article_id,
            'order_index', c.order_index,
            'inline_number', c.inline_number,
            'sub_number', ${hasSubNumber ? "c.sub_number" : "1"},
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
          ) ORDER BY c.inline_number, ${hasSubNumber ? "c.sub_number" : "c.order_index"})
          FROM citations c
          JOIN articles a ON a.id = c.article_id
          WHERE c.document_id = d.id
         ) as citations
         FROM documents d
         WHERE d.id = $1 AND d.project_id = $2`,
        [paramsP.data.docId, paramsP.data.projectId],
      );

      if (res.rowCount === 0) {
        return reply.code(404).send({ error: "Document not found" });
      }

      return { document: res.rows[0] };
    },
  );

  // POST /api/projects/:projectId/documents - создать документ
  fastify.post(
    "/projects/:projectId/documents",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const bodyP = CreateDocumentSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }

      const access = await checkProjectAccess(
        paramsP.data.projectId,
        userId,
        true,
      );
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      // Получить max order_index
      const maxOrder = await pool.query(
        `SELECT COALESCE(MAX(order_index), -1) + 1 as next_order
         FROM documents WHERE project_id = $1`,
        [paramsP.data.projectId],
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
        ],
      );

      // Invalidate documents cache
      await invalidateDocuments(paramsP.data.projectId);

      return { document: res.rows[0] };
    },
  );

  // PATCH /api/projects/:projectId/documents/:docId - обновить документ
  fastify.patch(
    "/projects/:projectId/documents/:docId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const bodyP = UpdateDocumentSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply.code(400).send({ error: "Invalid body" });
      }

      const access = await checkProjectAccess(
        paramsP.data.projectId,
        userId,
        true,
      );
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      const updates: string[] = [];
      const values: unknown[] = [];
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
        values,
      );

      if (res.rowCount === 0) {
        return reply.code(404).send({ error: "Document not found" });
      }

      // Invalidate document cache
      await invalidateDocument(paramsP.data.projectId, paramsP.data.docId);

      return { document: res.rows[0] };
    },
  );

  // DELETE /api/projects/:projectId/documents/:docId - удалить документ
  fastify.delete(
    "/projects/:projectId/documents/:docId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const access = await checkProjectAccess(
        paramsP.data.projectId,
        userId,
        true,
      );
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      await pool.query(
        `DELETE FROM documents WHERE id = $1 AND project_id = $2`,
        [paramsP.data.docId, paramsP.data.projectId],
      );

      // Invalidate documents cache
      await invalidateDocuments(paramsP.data.projectId);

      return { ok: true };
    },
  );

  // PUT /api/projects/:projectId/documents/reorder - обновить порядок документов
  fastify.put(
    "/projects/:projectId/documents/reorder",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const bodyP = ReorderDocumentsSchema.safeParse(request.body);
      if (!bodyP.success) {
        return reply
          .code(400)
          .send({ error: "Invalid body", message: bodyP.error.message });
      }

      const access = await checkProjectAccess(
        paramsP.data.projectId,
        userId,
        true,
      );
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      const { documentIds } = bodyP.data;

      // Batch update order_index using a single query with UNNEST
      // This avoids N+1 queries when reordering many documents
      if (documentIds.length > 0) {
        const ids = documentIds;
        const indexes = documentIds.map((_: string, i: number) => i);

        await pool.query(
          `UPDATE documents AS d
           SET order_index = v.new_order, updated_at = NOW()
           FROM (SELECT UNNEST($1::uuid[]) AS id, UNNEST($2::int[]) AS new_order) AS v
           WHERE d.id = v.id AND d.project_id = $3`,
          [ids, indexes, paramsP.data.projectId],
        );
      }

      return { ok: true };
    },
  );

  // POST /api/projects/:projectId/renumber-citations - перенумерация цитат после изменения порядка документов
  fastify.post(
    "/projects/:projectId/renumber-citations",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const access = await checkProjectAccess(
        paramsP.data.projectId,
        userId,
        true,
      );
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      const projectId = paramsP.data.projectId;

      // 1. Получить все документы в правильном порядке
      const docsRes = await pool.query(
        `SELECT id, content FROM documents 
         WHERE project_id = $1 
         ORDER BY order_index, created_at`,
        [projectId],
      );

      // 2. Получить все цитаты проекта с article_id
      const citationsRes = await pool.query(
        `SELECT c.id, c.document_id, c.article_id, c.inline_number
         FROM citations c
         JOIN documents d ON d.id = c.document_id
         WHERE d.project_id = $1
         ORDER BY d.order_index, c.inline_number`,
        [projectId],
      );

      // 3. Создаём глобальную нумерацию: article_id -> глобальный номер
      const articleToGlobalNumber = new Map<string, number>();
      let globalNumber = 1;

      // Обходим документы в порядке их order_index
      for (const doc of docsRes.rows) {
        // Получаем цитаты этого документа
        const docCitations = citationsRes.rows.filter(
          (c: { document_id: string }) => c.document_id === doc.id,
        );

        // Сортируем по inline_number (порядок появления в документе)
        docCitations.sort(
          (a: { inline_number: number }, b: { inline_number: number }) =>
            a.inline_number - b.inline_number,
        );

        for (const citation of docCitations) {
          if (!articleToGlobalNumber.has(citation.article_id)) {
            articleToGlobalNumber.set(citation.article_id, globalNumber);
            globalNumber++;
          }
        }
      }

      // 4. Обновляем inline_number для всех цитат
      const oldToNewMapping = new Map<
        string,
        { oldNum: number; newNum: number; docId: string }
      >();

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
            [newNum, citation.id],
          );
        }
      }

      // 5. Обновляем контент документов - заменяем номера цитат в HTML
      for (const doc of docsRes.rows) {
        let content = doc.content || "";
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
            "g",
          );
          content = content.replace(
            oldAttrPattern,
            `$1data-citation-number="${change.newNum}"`,
          );

          // Заменяем текст [n] внутри span с этим citation-id
          const oldTextPattern = new RegExp(
            `(<span[^>]*data-citation-id="${change.citationId}"[^>]*>)\\[${change.oldNum}\\](<\\/span>)`,
            "g",
          );
          content = content.replace(oldTextPattern, `$1[${change.newNum}]$2`);

          updated = true;
        }

        if (updated) {
          await pool.query(
            `UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2`,
            [content, doc.id],
          );
        }
      }

      // 6. Возвращаем обновлённые документы
      const updatedDocsRes = await pool.query(
        `SELECT id, title, content, order_index, created_at, updated_at
         FROM documents
         WHERE project_id = $1
         ORDER BY order_index, created_at`,
        [projectId],
      );

      return {
        ok: true,
        renumbered: oldToNewMapping.size,
        documents: updatedDocsRes.rows,
      };
    },
  );
};

export default crudPlugin;
