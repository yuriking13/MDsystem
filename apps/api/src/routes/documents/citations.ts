import type { FastifyPluginAsync } from "fastify";
import { pool } from "../../pg.js";
import { getUserId } from "../../utils/auth-helpers.js";
import {
  DocumentIdSchema,
  CitationIdSchema,
  AddCitationSchema,
  UpdateCitationSchema,
  SyncCitationsSchema,
} from "./types.js";
import {
  checkProjectAccess,
  hasSubNumberColumn,
  getDedupeKey,
} from "./helpers.js";

/**
 * Citations management plugin
 * Handles: add, update, delete, sync citations
 */
const citationsPlugin: FastifyPluginAsync = async (fastify) => {
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
      const userId = getUserId(request);

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const bodyP = AddCitationSchema.safeParse(request.body);
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

      // Получаем PMID и DOI добавляемой статьи для дедупликации
      const articleInfo = await pool.query(
        `SELECT pmid, doi FROM articles WHERE id = $1`,
        [bodyP.data.articleId],
      );

      const articlePmid = articleInfo.rows[0]?.pmid;
      const articleDoi = articleInfo.rows[0]?.doi;

      // Проверяем, есть ли уже цитаты на этот источник (по article_id)
      let existingCitations = await pool.query(
        `SELECT inline_number, sub_number FROM citations 
         WHERE document_id = $1 AND article_id = $2 
         ORDER BY sub_number`,
        [paramsP.data.docId, bodyP.data.articleId],
      );

      let inlineNumber: number;
      let subNumber = 1;

      // Если нет цитат с этим article_id, проверяем дубликаты по PMID/DOI
      if (
        (existingCitations.rowCount ?? 0) === 0 &&
        (articlePmid || articleDoi)
      ) {
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
          articlePmid || "",
          articleDoi || "",
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
        const usedSubNumbers = new Set(
          existingCitations.rows.map(
            (r: { sub_number: number }) => r.sub_number || 1,
          ),
        );
        subNumber = 1;
        while (usedSubNumbers.has(subNumber)) {
          subNumber++;
        }
      } else {
        // Новый источник - найти минимальный свободный inline_number
        // Это обеспечивает компактную нумерацию без пропусков
        const usedInlineNumbers = await pool.query(
          `SELECT DISTINCT inline_number FROM citations WHERE document_id = $1 ORDER BY inline_number`,
          [paramsP.data.docId],
        );
        const usedNumbers = new Set(
          usedInlineNumbers.rows.map(
            (r: { inline_number: number }) => r.inline_number,
          ),
        );
        inlineNumber = 1;
        while (usedNumbers.has(inlineNumber)) {
          inlineNumber++;
        }
      }

      // Получить следующий order_index
      const maxOrder = await pool.query(
        `SELECT COALESCE(MAX(order_index), 0) + 1 as next_order
         FROM citations WHERE document_id = $1`,
        [paramsP.data.docId],
      );

      try {
        const hasSubNumber = await hasSubNumberColumn();

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
              ],
        );

        return { citation: { ...res.rows[0], sub_number: subNumber } };
      } catch (err) {
        console.error("Add citation error:", err);
        return reply.code(400).send({ error: "Failed to add citation" });
      }
    },
  );

  // PATCH /api/projects/:projectId/documents/:docId/citations/:citationId - обновить цитату
  fastify.patch(
    "/projects/:projectId/documents/:docId/citations/:citationId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = CitationIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const bodyP = UpdateCitationSchema.safeParse(request.body);
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
        values,
      );

      if (res.rowCount === 0) {
        return reply.code(404).send({ error: "Citation not found" });
      }

      return { citation: res.rows[0] };
    },
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
      const userId = getUserId(request);

      const paramsP = CitationIdSchema.safeParse(request.params);
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

      // Получаем информацию об удаляемой цитате
      const citationToDelete = await pool.query(
        `SELECT article_id, inline_number FROM citations WHERE id = $1 AND document_id = $2`,
        [paramsP.data.citationId, paramsP.data.docId],
      );

      if (citationToDelete.rowCount === 0) {
        return reply.code(404).send({ error: "Citation not found" });
      }

      const articleId = citationToDelete.rows[0].article_id;
      const deletedInlineNumber = citationToDelete.rows[0].inline_number;

      // Удаляем цитату
      await pool.query(
        `DELETE FROM citations WHERE id = $1 AND document_id = $2`,
        [paramsP.data.citationId, paramsP.data.docId],
      );

      // Проверяем, остались ли ещё цитаты этого источника
      const remainingForArticle = await pool.query(
        `SELECT COUNT(*) as count FROM citations WHERE document_id = $1 AND article_id = $2`,
        [paramsP.data.docId, articleId],
      );

      const articleHasMoreCitations =
        parseInt(remainingForArticle.rows[0].count) > 0;

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
          [paramsP.data.docId, articleId],
        );
      } else {
        // Удалена последняя цитата источника - нужно проверить, есть ли источники после
        // и если есть, сдвинуть их номера на -1
        const sourcesAfter = await pool.query(
          `SELECT DISTINCT article_id FROM citations 
           WHERE document_id = $1 AND inline_number > $2`,
          [paramsP.data.docId, deletedInlineNumber],
        );

        if ((sourcesAfter.rowCount ?? 0) > 0) {
          // Есть источники после - сдвигаем все номера > deletedInlineNumber на -1
          await pool.query(
            `UPDATE citations 
             SET inline_number = inline_number - 1 
             WHERE document_id = $1 AND inline_number > $2`,
            [paramsP.data.docId, deletedInlineNumber],
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
        [paramsP.data.docId],
      );

      return { ok: true };
    },
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
      const userId = getUserId(request);

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const bodyP = SyncCitationsSchema.safeParse(request.body);
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

      const { docId, projectId } = paramsP.data;
      const citationIdsInHtml = new Set(bodyP.data.citationIds);

      // Получаем все цитаты документа из БД
      const existingCitations = await pool.query(
        `SELECT id FROM citations WHERE document_id = $1`,
        [docId],
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
          [toDelete, docId],
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
        [docId],
      );

      // Группируем по ключу дедупликации, сохраняем порядок первого появления
      const dedupeKeyToNumber = new Map<string, number>();
      const dedupeKeyOrder: string[] = [];

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
            [newInlineNumber, row.id],
          );
        }
      }

      // Перенумеровываем sub_number для каждой группы дедупликации
      // (группируем по ключу, а не по article_id)
      const citationsByDedupeKey = new Map<
        string,
        Array<{ id: string; order_index: number }>
      >();
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
            [i + 1, citations[i].id],
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
        [docId],
      );

      // Возвращаем обновлённый документ с цитатами
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
        [docId, projectId],
      );

      return {
        ok: true,
        deleted: toDelete.length,
        document: res.rows[0],
      };
    },
  );
};

export default citationsPlugin;
