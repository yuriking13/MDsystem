import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pool } from "../../pg.js";
import {
  formatCitation,
  type CitationStyle,
  type BibliographyArticle,
} from "../../lib/bibliography.js";
import { getUserId } from "../../utils/auth-helpers.js";
import { ProjectIdSchema } from "./types.js";
import {
  checkProjectAccess,
  hasVolumeColumns,
  getDedupeKey,
} from "./helpers.js";

/**
 * Export and bibliography plugin
 * Handles: export project, get bibliography
 */
const exportPlugin: FastifyPluginAsync = async (fastify) => {
  // GET /api/projects/:projectId/export - экспорт всех документов со списком литературы
  fastify.get(
    "/projects/:projectId/export",
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

      // Получить стиль цитирования проекта
      const projectRes = await pool.query(
        `SELECT citation_style, name FROM projects WHERE id = $1`,
        [paramsP.data.projectId],
      );
      const citationStyle = (projectRes.rows[0]?.citation_style ||
        "gost") as CitationStyle;
      const projectName = projectRes.rows[0]?.name || "Project";

      // Получить все документы
      const docsRes = await pool.query(
        `SELECT id, title, content, order_index
         FROM documents
         WHERE project_id = $1
         ORDER BY order_index, created_at`,
        [paramsP.data.projectId],
      );

      // Проверяем существование колонок volume
      const hasVolume = await hasVolumeColumns();

      // =======================================================================
      // ЛОГИКА ОБЪЕДИНЕНИЯ ДУБЛИКАТОВ ПРИ ЭКСПОРТЕ
      // =======================================================================
      // 1. Получаем ВСЕ цитаты с полными данными статей
      // 2. Определяем "ключ дедупликации" для каждой статьи (PMID > DOI > title_en)
      // 3. Группируем по ключу, выбираем первое появление (по order_index документа + inline_number)
      // 4. Создаём маппинг: article_id -> глобальный номер (с учётом дубликатов)
      // =======================================================================

      const allCitationsRes = await pool.query(
        hasVolume
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
        [paramsP.data.projectId],
      );

      // Группируем статьи по ключу дедупликации
      // Сохраняем первое появление (по порядку документов и inline_number)
      const dedupeKeyToArticle = new Map<string, Record<string, unknown>>();
      const dedupeKeyOrder: string[] = [];
      const articleIdToDedupeKey = new Map<string, string>();

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
      const bibliography: {
        number: number;
        articleId: string;
        formatted: string;
      }[] = [];
      const dedupeKeyToNumber = new Map<string, number>();

      dedupeKeyOrder.forEach((dedupeKey, index) => {
        const article = dedupeKeyToArticle.get(dedupeKey)!;
        const globalNumber = index + 1;
        dedupeKeyToNumber.set(dedupeKey, globalNumber);

        const bibArticle: BibliographyArticle = {
          title_en: article.title_en as string,
          title_ru: article.title_ru as string,
          authors: article.authors as string[],
          journal: article.journal as string,
          year: article.year as number,
          volume: article.volume as string,
          issue: article.issue as string,
          pages: article.pages as string,
          doi: article.doi as string,
          pmid: article.pmid as string,
        };

        bibliography.push({
          number: globalNumber,
          articleId: article.id as string,
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

      // Функция перенумерации цитат в HTML контенте документа
      function renumberCitationsInContent(
        content: string,
        docId: string,
      ): string {
        if (!content) return "";

        // Заменяем data-citation-number и текст [n] в span элементах
        let result = content.replace(
          /<span[^>]*class="citation-ref"[^>]*data-citation-number="(\d+)"[^>]*>\[(\d+)\]<\/span>/g,
          (match: string, attrNum: string, textNum: string) => {
            const key = `${docId}:${attrNum}`;
            const globalNum = citationMapping.get(key);
            if (globalNum !== undefined) {
              return match
                .replace(
                  `data-citation-number="${attrNum}"`,
                  `data-citation-number="${globalNum}"`,
                )
                .replace(`[${textNum}]`, `[${globalNum}]`);
            }
            return match;
          },
        );

        // Также обрабатываем обратный порядок атрибутов (data-citation-number перед class)
        result = result.replace(
          /<span[^>]*data-citation-number="(\d+)"[^>]*class="citation-ref"[^>]*>\[(\d+)\]<\/span>/g,
          (match: string, attrNum: string, textNum: string) => {
            const key = `${docId}:${attrNum}`;
            const globalNum = citationMapping.get(key);
            if (globalNum !== undefined) {
              return match
                .replace(
                  `data-citation-number="${attrNum}"`,
                  `data-citation-number="${globalNum}"`,
                )
                .replace(`[${textNum}]`, `[${globalNum}]`);
            }
            return match;
          },
        );

        return result;
      }

      // Перенумеровываем цитаты в каждом документе для глобальной нумерации
      const documentsWithGlobalNumbers = docsRes.rows.map(
        (doc: Record<string, unknown>) => ({
          ...doc,
          content: renumberCitationsInContent(
            doc.content as string,
            doc.id as string,
          ),
        }),
      );

      // Объединённый контент с перенумерованными цитатами
      let mergedContent = "";
      for (const doc of documentsWithGlobalNumbers) {
        if (mergedContent) {
          mergedContent += '<hr class="chapter-break" />';
        }
        mergedContent += `<h1 class="chapter-title">${doc.title}</h1>`;
        mergedContent += doc.content || "";
      }

      return {
        projectName,
        citationStyle,
        documents: documentsWithGlobalNumbers, // Документы с глобальной нумерацией цитат
        bibliography,
        mergedContent, // Объединённый контент с перенумерованными цитатами
      };
    },
  );

  // GET /api/projects/:projectId/bibliography - только список литературы
  fastify.get(
    "/projects/:projectId/bibliography",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = ProjectIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid project ID" });
      }

      const querySchema = z.object({
        style: z.enum(["gost", "apa", "vancouver"]).optional(),
      });
      const queryP = querySchema.safeParse(request.query);

      const access = await checkProjectAccess(paramsP.data.projectId, userId);
      if (!access.ok) {
        return reply.code(404).send({ error: "Project not found" });
      }

      // Получить стиль цитирования проекта
      const projectRes = await pool.query(
        `SELECT citation_style FROM projects WHERE id = $1`,
        [paramsP.data.projectId],
      );
      const citationStyle =
        (queryP.success && queryP.data.style) ||
        projectRes.rows[0]?.citation_style ||
        "gost";

      // Проверяем существование колонок volume
      const hasVolume = await hasVolumeColumns();

      // =======================================================================
      // ЛОГИКА ОБЪЕДИНЕНИЯ ДУБЛИКАТОВ
      // =======================================================================
      // 1. Получаем ВСЕ цитаты с полными данными статей (отсортированные по порядку появления)
      // 2. Определяем "ключ дедупликации" для каждой статьи (PMID > DOI > title_en)
      // 3. Группируем по ключу, выбираем первое появление
      // =======================================================================

      const allCitationsRes = await pool.query(
        hasVolume
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
        [paramsP.data.projectId],
      );

      // Группируем статьи по ключу дедупликации
      const dedupeKeyToArticle = new Map<string, Record<string, unknown>>();
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
          title_en: article.title_en as string,
          title_ru: article.title_ru as string,
          authors: article.authors as string[],
          journal: article.journal as string,
          year: article.year as number,
          volume: article.volume as string,
          issue: article.issue as string,
          pages: article.pages as string,
          doi: article.doi as string,
          pmid: article.pmid as string,
        };

        return {
          number: index + 1,
          articleId: article.id as string,
          formatted: formatCitation(bibArticle, citationStyle as CitationStyle),
          raw: bibArticle,
        };
      });

      return { citationStyle, bibliography };
    },
  );
};

export default exportPlugin;
