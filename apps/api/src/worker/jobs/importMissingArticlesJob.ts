/**
 * Job для импорта недостающих статей из PubMed (по PMID) и Crossref (по DOI)
 * Используется перед генерацией embeddings для расширения семантического ядра
 */

import { pool } from "../../pg.js";
import { pubmedFetchByPmids } from "../../lib/pubmed.js";
import { getCrossrefByDOI, type CrossrefWork } from "../../lib/crossref.js";
import { createLogger } from "../../utils/logger.js";
import { broadcastToProject } from "../../websocket.js";
import { decryptApiKey } from "../../utils/apiKeyCrypto.js";

const log = createLogger("import-missing-articles");

// Константы
const MAX_JOB_DURATION_MS = 60 * 60 * 1000; // 1 час максимум
const PUBMED_BATCH_SIZE = 100; // Размер batch для PubMed API
const PUBMED_THROTTLE_MS = 350; // ~3 req/sec без API key
const CROSSREF_THROTTLE_MS = 100; // Crossref polite pool
const CROSSREF_PARALLEL = 5; // Параллельные запросы к Crossref

// Типы публикаций, которые нужно пропускать (ретракции, ошибки, и т.д.)
const EXCLUDED_PUBLICATION_TYPES = [
  "Retracted Publication",
  "Retraction of Publication",
  "Published Erratum",
  "Correction",
  "Expression of Concern",
];

// Получаем API ключ пользователя из базы
async function getUserApiKey(
  userId: string,
  provider: string,
): Promise<string | null> {
  const result = await pool.query(
    `SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
    [userId, provider],
  );
  if (result.rows.length === 0) return null;
  return decryptApiKey(result.rows[0].encrypted_key);
}

export interface ImportMissingArticlesPayload {
  projectId: string;
  userId: string;
  jobId: string; // ID embedding job для обновления прогресса
}

interface MissingArticleInfo {
  pmid?: string;
  doi?: string;
  source: "reference" | "cited_by";
}

/**
 * Получить список недостающих статей из графа
 * Ищет PMIDs только из cited_by_pmids (цитирующие статьи)
 * References не импортируем - их слишком много (60-80k)
 */
async function getMissingArticles(projectId: string): Promise<{
  missingPmids: MissingArticleInfo[];
  missingDois: MissingArticleInfo[];
}> {
  // PMIDs только из cited_by (цитирующие статьи)
  const citedByPmidsQuery = `
    WITH project_articles AS (
      SELECT a.id, a.cited_by_pmids
      FROM articles a
      JOIN project_articles pa ON pa.article_id = a.id
      WHERE pa.project_id = $1 AND pa.status != 'deleted'
    ),
    all_cited_pmids AS (
      SELECT DISTINCT cited_pmid
      FROM project_articles
      CROSS JOIN LATERAL unnest(COALESCE(cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
      WHERE cited_pmid IS NOT NULL AND cited_pmid != ''
    )
    SELECT cited_pmid as pmid
    FROM all_cited_pmids
    WHERE NOT EXISTS (
      SELECT 1 FROM articles WHERE pmid = cited_pmid
    )
  `;

  const citedByPmids = await pool.query(citedByPmidsQuery, [projectId]);

  // Собираем PMIDs цитирующих статей
  const missingPmids: MissingArticleInfo[] = citedByPmids.rows.map(
    (row: any) => ({
      pmid: row.pmid,
      source: "cited_by" as const,
    }),
  );

  // DOIs не импортируем - они из references
  return {
    missingPmids,
    missingDois: [], // Пусто - DOIs из references не импортируем
  };
}

/**
 * Проверка, является ли статья ретракцией или ошибкой
 */
function isRetractedOrErrorPublication(
  publicationTypes: string[] | undefined,
): boolean {
  if (!publicationTypes || publicationTypes.length === 0) return false;
  return publicationTypes.some((pt) =>
    EXCLUDED_PUBLICATION_TYPES.some((excluded) =>
      pt.toLowerCase().includes(excluded.toLowerCase()),
    ),
  );
}

/**
 * Импорт статей из PubMed по PMIDs
 */
async function importFromPubMed(
  pmids: string[],
  pubmedApiKey: string | null,
  onProgress: (imported: number, skipped: number, errors: number) => void,
): Promise<{ imported: number; skipped: number; errors: number }> {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Обрабатываем батчами
  for (let i = 0; i < pmids.length; i += PUBMED_BATCH_SIZE) {
    const batch = pmids.slice(i, i + PUBMED_BATCH_SIZE);

    try {
      const articles = await pubmedFetchByPmids({
        pmids: batch,
        apiKey: pubmedApiKey || undefined,
        throttleMs: PUBMED_THROTTLE_MS,
      });

      for (const article of articles) {
        try {
          // Проверяем типы публикации (PubMed их не возвращает напрямую, но у нас есть studyTypes)
          // studyTypes могут содержать информацию о ретракциях - проверяем
          if (
            article.studyTypes &&
            isRetractedOrErrorPublication(article.studyTypes)
          ) {
            log.info(`Skipping retracted/erratum article: ${article.pmid}`);
            skipped++;
            continue;
          }

          // Вставляем статью в БД
          await pool.query(
            `INSERT INTO articles (
              pmid, doi, title_en, abstract_en, authors, year, journal, url, source, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
            ON CONFLICT (pmid) DO NOTHING`,
            [
              article.pmid,
              article.doi || null,
              article.title,
              article.abstract || null,
              article.authors || null,
              article.year || null,
              article.journal || null,
              article.url,
              "pubmed-import",
            ],
          );
          imported++;
        } catch (err) {
          log.warn(`Failed to insert article ${article.pmid}:`, { error: err });
          errors++;
        }
      }

      // Обновляем прогресс
      onProgress(imported, skipped, errors);

      // Throttle между батчами
      if (i + PUBMED_BATCH_SIZE < pmids.length) {
        await new Promise((r) => setTimeout(r, PUBMED_THROTTLE_MS));
      }
    } catch (err) {
      log.error(`PubMed batch fetch error:`, err);
      errors += batch.length;
      onProgress(imported, skipped, errors);
    }
  }

  return { imported, skipped, errors };
}

/**
 * Преобразование Crossref work в данные статьи
 */
function crossrefWorkToArticle(
  doi: string,
  work: CrossrefWork,
): {
  doi: string;
  title: string;
  abstract?: string;
  authors?: string;
  year?: number;
  journal?: string;
  url: string;
  publicationType?: string;
} | null {
  // Проверка на ретракцию по типу
  const workType = work.type?.toLowerCase() || "";
  if (
    workType.includes("retract") ||
    workType.includes("erratum") ||
    workType.includes("correction")
  ) {
    return null;
  }

  const title = work.title?.[0] || "";
  if (!title) return null;

  // Авторы
  const authors = work.author
    ?.map((a) => [a.family, a.given].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(", ");

  // Год
  const yearParts =
    work.issued?.["date-parts"]?.[0] || work.published?.["date-parts"]?.[0];
  const year = yearParts?.[0];

  // Журнал
  const journal = work["container-title"]?.[0];

  return {
    doi: doi.toLowerCase(),
    title,
    abstract: work.abstract
      ? work.abstract.replace(/<[^>]+>/g, "").trim()
      : undefined,
    authors,
    year,
    journal,
    url: `https://doi.org/${doi}`,
    publicationType: work.type,
  };
}

/**
 * Импорт статей из Crossref по DOIs
 */
async function importFromCrossref(
  dois: string[],
  onProgress: (imported: number, skipped: number, errors: number) => void,
): Promise<{ imported: number; skipped: number; errors: number }> {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Параллельная обработка
  const queue = [...dois];
  const inProgress = new Set<Promise<void>>();

  while (queue.length > 0 || inProgress.size > 0) {
    // Запускаем новые запросы
    while (queue.length > 0 && inProgress.size < CROSSREF_PARALLEL) {
      const doi = queue.shift()!;

      const promise = (async () => {
        try {
          // Throttle
          await new Promise((r) => setTimeout(r, CROSSREF_THROTTLE_MS));

          const work = await getCrossrefByDOI(doi);
          if (!work) {
            errors++;
            return;
          }

          const articleData = crossrefWorkToArticle(doi, work);
          if (!articleData) {
            // Ретракция или нет title
            skipped++;
            return;
          }

          // Вставляем в БД
          await pool.query(
            `INSERT INTO articles (
              doi, title_en, abstract_en, authors, year, journal, url, source, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
            ON CONFLICT (doi) DO NOTHING`,
            [
              articleData.doi,
              articleData.title,
              articleData.abstract || null,
              articleData.authors || null,
              articleData.year || null,
              articleData.journal || null,
              articleData.url,
              "crossref-import",
            ],
          );
          imported++;
        } catch (err) {
          log.warn(`Failed to import DOI ${doi}:`, { error: err });
          errors++;
        } finally {
          onProgress(imported, skipped, errors);
        }
      })();

      promise.finally(() => {
        inProgress.delete(promise);
      });
      inProgress.add(promise);
    }

    // Ждём завершения хотя бы одного
    if (inProgress.size > 0) {
      await Promise.race(inProgress);
    }
  }

  return { imported, skipped, errors };
}

/**
 * Обновление прогресса в embedding job
 */
async function updateImportProgress(
  jobId: string,
  projectId: string,
  phase: string,
  progress: {
    imported: number;
    skipped: number;
    errors: number;
    totalPmids: number;
    totalDois: number;
  },
) {
  // Обновляем error_message временно для показа фазы импорта
  await pool.query(
    `UPDATE embedding_jobs 
     SET error_message = $2, updated_at = now()
     WHERE id = $1`,
    [
      jobId,
      `[Import] ${phase}: imported=${progress.imported}, skipped=${progress.skipped}, errors=${progress.errors}`,
    ],
  );

  // WebSocket оповещение
  broadcastToProject(projectId, {
    type: "embedding:import-progress" as any,
    projectId,
    payload: {
      jobId,
      phase,
      ...progress,
    },
    timestamp: Date.now(),
  });
}

/**
 * Основная функция импорта недостающих статей
 */
export async function runImportMissingArticles(
  payload: ImportMissingArticlesPayload,
): Promise<{
  imported: number;
  skipped: number;
  errors: number;
  totalPmids: number;
  totalDois: number;
}> {
  const { projectId, userId, jobId } = payload;
  const startTime = Date.now();

  log.info("Starting import of missing articles", { jobId, projectId });

  try {
    // Получаем API ключ PubMed (опционально)
    const pubmedApiKey = await getUserApiKey(userId, "pubmed");

    // Получаем список недостающих статей
    const { missingPmids, missingDois } = await getMissingArticles(projectId);

    const totalPmids = missingPmids.length;
    const totalDois = missingDois.length;

    log.info("Found missing articles", {
      jobId,
      pmids: totalPmids,
      dois: totalDois,
    });

    if (totalPmids === 0 && totalDois === 0) {
      return {
        imported: 0,
        skipped: 0,
        errors: 0,
        totalPmids: 0,
        totalDois: 0,
      };
    }

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Фаза 1: Импорт из PubMed
    if (totalPmids > 0) {
      await updateImportProgress(jobId, projectId, "PubMed", {
        imported: 0,
        skipped: 0,
        errors: 0,
        totalPmids,
        totalDois,
      });

      const pmidList = missingPmids.map((m) => m.pmid!);
      const pubmedResult = await importFromPubMed(
        pmidList,
        pubmedApiKey,
        (imported, skipped, errors) => {
          totalImported = imported;
          totalSkipped = skipped;
          totalErrors = errors;
          updateImportProgress(jobId, projectId, "PubMed", {
            imported: totalImported,
            skipped: totalSkipped,
            errors: totalErrors,
            totalPmids,
            totalDois,
          });
        },
      );

      totalImported = pubmedResult.imported;
      totalSkipped = pubmedResult.skipped;
      totalErrors = pubmedResult.errors;

      log.info("PubMed import completed", {
        jobId,
        ...pubmedResult,
      });
    }

    // Проверяем timeout
    if (Date.now() - startTime > MAX_JOB_DURATION_MS) {
      log.warn("Import job timeout, stopping before Crossref phase");
      return {
        imported: totalImported,
        skipped: totalSkipped,
        errors: totalErrors,
        totalPmids,
        totalDois,
      };
    }

    // Фаза 2: Импорт из Crossref
    if (totalDois > 0) {
      await updateImportProgress(jobId, projectId, "Crossref", {
        imported: totalImported,
        skipped: totalSkipped,
        errors: totalErrors,
        totalPmids,
        totalDois,
      });

      const doiList = missingDois.map((m) => m.doi!);
      const crossrefResult = await importFromCrossref(
        doiList,
        (imported, skipped, errors) => {
          updateImportProgress(jobId, projectId, "Crossref", {
            imported: totalImported + imported,
            skipped: totalSkipped + skipped,
            errors: totalErrors + errors,
            totalPmids,
            totalDois,
          });
        },
      );

      totalImported += crossrefResult.imported;
      totalSkipped += crossrefResult.skipped;
      totalErrors += crossrefResult.errors;

      log.info("Crossref import completed", {
        jobId,
        ...crossrefResult,
      });
    }

    // Очищаем error_message после успешного импорта
    await pool.query(
      `UPDATE embedding_jobs SET error_message = NULL WHERE id = $1`,
      [jobId],
    );

    log.info("Import completed", {
      jobId,
      imported: totalImported,
      skipped: totalSkipped,
      errors: totalErrors,
    });

    return {
      imported: totalImported,
      skipped: totalSkipped,
      errors: totalErrors,
      totalPmids,
      totalDois,
    };
  } catch (err) {
    log.error("Import failed", { jobId, error: err });
    throw err;
  }
}
