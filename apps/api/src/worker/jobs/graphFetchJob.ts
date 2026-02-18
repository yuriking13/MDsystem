import { pool } from "../../pg.js";
import {
  enrichArticlesWithReferences,
  pubmedFetchByPmids,
  europePMCGetCitationCounts,
} from "../../lib/pubmed.js";
import { decryptApiKey } from "../../utils/apiKeyCrypto.js";
import { getCrossrefByDOI, extractEnrichedData } from "../../lib/crossref.js";
import { createLogger } from "../../utils/logger.js";
import { startBoss } from "../boss.js";
import type { EmbeddingsJobPayload, GraphFetchJobPayload } from "../types.js";

const log = createLogger("graph-fetch");

// Константы для контроля времени выполнения
const MAX_JOB_DURATION_MS = 30 * 60 * 1000; // 30 минут максимум на весь job

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

// Обновление времени последнего прогресса
async function updateProgress(
  jobId: string,
  updates: {
    processed_articles?: number;
    fetched_pmids?: number;
    total_pmids_to_fetch?: number;
    phase?: string;
    phase_progress?: string;
  },
) {
  const setClauses: string[] = ["last_progress_at = now()"];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (updates.processed_articles !== undefined) {
    setClauses.push(`processed_articles = $${paramIdx++}`);
    values.push(updates.processed_articles);
  }
  if (updates.fetched_pmids !== undefined) {
    setClauses.push(`fetched_pmids = $${paramIdx++}`);
    values.push(updates.fetched_pmids);
  }
  if (updates.total_pmids_to_fetch !== undefined) {
    setClauses.push(`total_pmids_to_fetch = $${paramIdx++}`);
    values.push(updates.total_pmids_to_fetch);
  }
  // Сохраняем текущую фазу и прогресс в error_message временно (для отладки)
  if (updates.phase) {
    setClauses.push(`error_message = $${paramIdx++}`);
    values.push(`[Phase: ${updates.phase}] ${updates.phase_progress || ""}`);
  }

  values.push(jobId);

  await pool.query(
    `UPDATE graph_fetch_jobs SET ${setClauses.join(", ")} WHERE id = $${paramIdx}`,
    values,
  );
}

// Проверка, не отменён ли job
async function isJobCancelled(jobId: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT status, cancelled_at FROM graph_fetch_jobs WHERE id = $1`,
    [jobId],
  );
  if (res.rows.length === 0) return true;
  return res.rows[0].status === "cancelled" || res.rows[0].cancelled_at != null;
}

// Локальный тип с jobId (расширяет базовый)
interface GraphFetchJobPayloadWithJobId extends GraphFetchJobPayload {
  jobId: string;
}

interface GraphArticleRow {
  id: string;
  pmid: string;
  reference_pmids?: string[] | null;
  cited_by_pmids?: string[] | null;
  references_fetched_at?: string | null;
}

interface DoiArticleRow {
  id: string;
  doi: string;
  source?: string | null;
}

interface ArticleReferencesUpdate {
  id: string;
  referencePmids: string[];
  citedByPmids: string[];
}

interface GraphCacheUpsertRow {
  pmid: string;
  title: string | null;
  authors: string | null;
  year: number | null;
  doi: string | null;
}

interface CitationCountUpdate {
  id: string;
  count: number;
}

const ARTICLE_UPDATE_BATCH_SIZE = 100;
const GRAPH_CACHE_UPSERT_BATCH_SIZE = 100;
const CITATION_COUNT_BATCH_SIZE = 100;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

async function bulkUpdateArticleReferences(
  updates: ArticleReferencesUpdate[],
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  const params: unknown[] = [];
  const valuesClause = updates
    .map((update) => {
      const base = params.length;
      params.push(update.id, update.referencePmids, update.citedByPmids);
      return `($${base + 1}, $${base + 2}::text[], $${base + 3}::text[])`;
    })
    .join(", ");

  await pool.query(
    `UPDATE articles AS a
     SET reference_pmids = v.reference_pmids,
         cited_by_pmids = v.cited_by_pmids,
         references_fetched_at = now()
     FROM (VALUES ${valuesClause}) AS v(id, reference_pmids, cited_by_pmids)
     WHERE a.id = v.id`,
    params,
  );
}

async function bulkUpsertGraphCache(
  rows: GraphCacheUpsertRow[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const params: unknown[] = [];
  const valuesClause = rows
    .map((row) => {
      const base = params.length;
      params.push(row.pmid, row.title, row.authors, row.year, row.doi);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, now(), now() + interval '30 days')`;
    })
    .join(", ");

  await pool.query(
    `INSERT INTO graph_cache (pmid, title, authors, year, doi, fetched_at, expires_at)
     VALUES ${valuesClause}
     ON CONFLICT (pmid) DO UPDATE SET
       title = COALESCE(EXCLUDED.title, graph_cache.title),
       authors = COALESCE(EXCLUDED.authors, graph_cache.authors),
       year = COALESCE(EXCLUDED.year, graph_cache.year),
       doi = COALESCE(EXCLUDED.doi, graph_cache.doi),
       fetched_at = now(),
       expires_at = now() + interval '30 days'`,
    params,
  );
}

async function bulkUpdateCitationCounts(
  updates: CitationCountUpdate[],
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  const params: unknown[] = [];
  const valuesClause = updates
    .map((update) => {
      const base = params.length;
      params.push(update.id, update.count);
      return `($${base + 1}, $${base + 2}::int)`;
    })
    .join(", ");

  await pool.query(
    `UPDATE articles AS a
     SET raw_json = COALESCE(a.raw_json, '{}'::jsonb) || jsonb_build_object('europePMCCitations', v.citation_count)
     FROM (VALUES ${valuesClause}) AS v(id, citation_count)
     WHERE a.id = v.id`,
    params,
  );
}

async function enqueueAutoEmbeddingsJob(
  payload: GraphFetchJobPayloadWithJobId,
): Promise<void> {
  const { projectId, userId, jobId: graphJobId } = payload;

  const activeEmbeddingJob = await pool.query(
    `SELECT id
     FROM embedding_jobs
     WHERE project_id = $1 AND status IN ('pending', 'running')
     ORDER BY created_at DESC
     LIMIT 1`,
    [projectId],
  );

  if (activeEmbeddingJob.rows.length > 0) {
    log.info("Auto-pipeline: active embeddings job already exists, skipping", {
      projectId,
      graphJobId,
      embeddingJobId: activeEmbeddingJob.rows[0].id,
    });
    return;
  }

  const embeddingJobRes = await pool.query(
    `INSERT INTO embedding_jobs (project_id, user_id, total, include_references, include_cited_by, status)
     VALUES ($1, $2, 0, true, true, 'pending')
     RETURNING id`,
    [projectId, userId],
  );
  const embeddingJobId = String(embeddingJobRes.rows[0].id);

  const boss = await startBoss();
  const embeddingPayload: EmbeddingsJobPayload = {
    projectId,
    userId,
    jobId: embeddingJobId,
    articleIds: null,
    includeReferences: true,
    includeCitedBy: true,
    importMissingArticles: true,
    autoPipeline: true,
  };
  await boss.send("embeddings:generate", embeddingPayload);

  log.info("Auto-pipeline: enqueued embeddings job", {
    projectId,
    graphJobId,
    embeddingJobId,
  });
}

export async function runGraphFetchJob(payload: GraphFetchJobPayloadWithJobId) {
  const { projectId, jobId, userId, selectedOnly, articleIds, autoPipeline } =
    payload;
  const startTime = Date.now();

  log.info("Starting graph fetch job", {
    jobId,
    projectId,
    userId,
    selectedOnly,
    autoPipeline: autoPipeline || false,
    articleCount: articleIds?.length || 0,
  });

  // Функция проверки таймаута и отмены
  const checkTimeoutAndCancellation = async (): Promise<boolean> => {
    // Проверяем общий таймаут
    if (Date.now() - startTime > MAX_JOB_DURATION_MS) {
      log.warn("Job exceeded max duration, cancelling", {
        jobId,
        maxDurationMs: MAX_JOB_DURATION_MS,
      });
      await pool.query(
        `UPDATE graph_fetch_jobs SET 
          status = 'cancelled', 
          cancelled_at = now(),
          cancel_reason = 'timeout',
          error_message = 'Превышено максимальное время выполнения (30 мин). Попробуйте загрузить связи для меньшего числа статей.'
         WHERE id = $1`,
        [jobId],
      );
      return true;
    }

    // Проверяем отмену пользователем
    if (await isJobCancelled(jobId)) {
      log.info("Job was cancelled by user", { jobId });
      return true;
    }

    return false;
  };

  try {
    log.debug("Updating job status to running", { jobId });
    // Обновляем статус на running с начальным временем прогресса
    await pool.query(
      `UPDATE graph_fetch_jobs SET status = 'running', started_at = now(), last_progress_at = now() WHERE id = $1`,
      [jobId],
    );
    log.debug("Job status updated, fetching articles", { jobId });

    // Получаем API ключ пользователя
    const apiKey = await getUserApiKey(userId, "pubmed");

    // Получаем статьи проекта с PMID (с учётом фильтров)
    // ВАЖНО: пропускаем статьи с уже загруженными references (references_fetched_at IS NOT NULL)
    let sql = `SELECT a.id, a.pmid, a.reference_pmids, a.cited_by_pmids, a.references_fetched_at
       FROM articles a
       JOIN project_articles pa ON pa.article_id = a.id
       WHERE pa.project_id = $1 AND a.pmid IS NOT NULL`;
    const params: unknown[] = [projectId];
    let paramIdx = 2;

    // Фильтр по статусу (только отобранные)
    if (selectedOnly) {
      sql += ` AND pa.status = 'selected'`;
    }

    // Фильтр по конкретным статьям
    if (articleIds && articleIds.length > 0) {
      sql += ` AND a.id = ANY($${paramIdx++})`;
      params.push(articleIds);
    }

    const articlesRes = await pool.query(sql, params);

    // Разделяем статьи: с уже загруженными references и без
    const allArticles = articlesRes.rows as GraphArticleRow[];
    const articlesNeedingRefs = allArticles.filter(
      (a) => !a.references_fetched_at,
    );
    const articlesWithRefs = allArticles.filter((a) => a.references_fetched_at);

    log.info("Found articles for processing", {
      total: allArticles.length,
      needRefs: articlesNeedingRefs.length,
      alreadyHaveRefs: articlesWithRefs.length,
    });

    const totalArticles = allArticles.length;
    const articlesToProcess = articlesNeedingRefs.length;

    await pool.query(
      `UPDATE graph_fetch_jobs SET total_articles = $1 WHERE id = $2`,
      [articlesToProcess, jobId],
    );

    // Если все статьи уже обработаны - завершаем
    if (articlesToProcess === 0) {
      log.info("All articles already have references, skipping fetch", {
        totalArticles,
        articlesWithRefs: articlesWithRefs.length,
      });
      await pool.query(
        `UPDATE graph_fetch_jobs SET status = 'completed', completed_at = now(), 
         error_message = 'Все статьи уже обработаны (${articlesWithRefs.length} шт.)' 
         WHERE id = $1`,
        [jobId],
      );

      if (autoPipeline) {
        try {
          await enqueueAutoEmbeddingsJob(payload);
        } catch (enqueueErr) {
          log.error(
            "Auto-pipeline enqueue failed after early completion",
            enqueueErr instanceof Error
              ? enqueueErr
              : new Error(String(enqueueErr)),
            { jobId, projectId },
          );
        }
      }
      return;
    }

    // Фаза 1: Загружаем references и cited_by только для статей БЕЗ references
    const pmids = articlesNeedingRefs
      .map((a: { pmid: string | null }) => a.pmid)
      .filter(Boolean) as string[];
    const idByPmid = new Map<string, string>();
    for (const row of articlesNeedingRefs) {
      idByPmid.set(row.pmid, row.id);
    }

    log.info("Processing articles", {
      count: pmids.length,
      alreadyCached: articlesWithRefs.length,
    });

    // Обновляем прогресс перед началом фазы 1
    await updateProgress(jobId, {
      phase: "1 - Загрузка references из PubMed",
      phase_progress: `0/${pmids.length} статей`,
    });

    // Проверяем отмену перед длительной операцией
    if (await checkTimeoutAndCancellation()) return;

    // Получаем references из PubMed с промежуточными обновлениями прогресса
    const refsMap = await enrichArticlesWithReferences({
      apiKey: apiKey || undefined,
      pmids,
      throttleMs: apiKey ? 100 : 350,
      onProgress: async (processed: number, total: number) => {
        // Обновляем прогресс каждые 10 статей или при завершении
        if (processed % 10 === 0 || processed === total) {
          await updateProgress(jobId, {
            phase: "1 - Загрузка references из PubMed",
            phase_progress: `${processed}/${total} статей`,
          });
        }
      },
      checkCancelled: async () => isJobCancelled(jobId),
    });

    // Собираем все уникальные PMIDs для кэширования
    const allPmidsToCache = new Set<string>();

    // Обновляем статьи и собираем PMIDs
    // Также считаем статистику найденных связей
    let processedArticles = 0;
    let totalReferencesFound = 0;
    let totalCitedByFound = 0;
    let articlesWithReferences = 0;
    let articlesWithCitedBy = 0;
    const articleReferenceUpdates: ArticleReferencesUpdate[] = [];

    for (const [pmid, refs] of refsMap) {
      const articleId = idByPmid.get(pmid);
      if (!articleId) continue;

      // Считаем статистику
      if (refs.references.length > 0) {
        articlesWithReferences++;
        totalReferencesFound += refs.references.length;
      }
      if (refs.citedBy.length > 0) {
        articlesWithCitedBy++;
        totalCitedByFound += refs.citedBy.length;
      }

      log.debug("Article references found", {
        pmid,
        refs: refs.references.length,
        citedBy: refs.citedBy.length,
      });

      // Обновляем статью
      // Убедимся что массивы корректные
      const refArray = Array.isArray(refs.references) ? refs.references : [];
      const citedByArray = Array.isArray(refs.citedBy) ? refs.citedBy : [];

      articleReferenceUpdates.push({
        id: articleId,
        referencePmids: refArray,
        citedByPmids: citedByArray,
      });

      // Добавляем PMIDs в список для кэширования
      refs.references.forEach((p) => allPmidsToCache.add(p));
      refs.citedBy.forEach((p) => allPmidsToCache.add(p));

      processedArticles++;

      // Обновляем прогресс каждые 10 статей с обновлением last_progress_at
      if (processedArticles % 10 === 0) {
        await updateProgress(jobId, {
          processed_articles: processedArticles,
          phase: "1.5 - Обработка результатов",
          phase_progress: `${processedArticles}/${refsMap.size} статей обработано`,
        });

        // Проверяем отмену
        if (await checkTimeoutAndCancellation()) return;
      }
    }

    for (const batch of chunkArray(
      articleReferenceUpdates,
      ARTICLE_UPDATE_BATCH_SIZE,
    )) {
      await bulkUpdateArticleReferences(batch);
    }

    log.info("Phase 1 complete", {
      articlesWithReferences,
      processedArticles,
      totalReferencesFound,
      articlesWithCitedBy,
      totalCitedByFound,
    });

    // Проверяем отмену перед фазой 2
    if (await checkTimeoutAndCancellation()) return;

    // Фаза 2: Кэшируем информацию о связанных статьях
    const pmidsToFetch = Array.from(allPmidsToCache);

    log.info("Phase 2 starting: caching unique PMIDs", {
      count: pmidsToFetch.length,
    });

    await updateProgress(jobId, {
      processed_articles: processedArticles,
      total_pmids_to_fetch: pmidsToFetch.length,
      phase: "2 - Кэширование метаданных статей",
      phase_progress: `0/${pmidsToFetch.length} PMIDs`,
    });

    // Загружаем информацию батчами
    const batchSize = 50;
    let fetchedPmids = 0;
    let cachedFromDb = 0;
    let fetchedFromPubmed = 0;

    for (let i = 0; i < pmidsToFetch.length; i += batchSize) {
      // Проверяем отмену перед каждым батчем
      if (await checkTimeoutAndCancellation()) return;

      const batch = pmidsToFetch.slice(i, i + batchSize);

      // Проверяем какие уже есть в кэше (не истёкшие)
      const existingRes = await pool.query(
        `SELECT pmid FROM graph_cache 
         WHERE pmid = ANY($1) AND (expires_at IS NULL OR expires_at > now())`,
        [batch],
      );
      const existingPmids = new Set(
        existingRes.rows.map((r: { pmid: string }) => r.pmid),
      );
      cachedFromDb += existingPmids.size;
      const toFetch = batch.filter((p: string) => !existingPmids.has(p));

      if (toFetch.length > 0) {
        try {
          // Загружаем из PubMed
          const fetched = await pubmedFetchByPmids({
            pmids: toFetch,
            apiKey: apiKey || undefined,
            throttleMs: apiKey ? 80 : 300,
          });

          fetchedFromPubmed += fetched.length;
          const upsertRows: GraphCacheUpsertRow[] = fetched.map((article) => ({
            pmid: article.pmid,
            title: article.title || null,
            authors: (article.authors || "").split(",")[0]?.trim() || "Unknown",
            year: article.year ?? null,
            doi: article.doi ?? null,
          }));

          for (const cacheBatch of chunkArray(
            upsertRows,
            GRAPH_CACHE_UPSERT_BATCH_SIZE,
          )) {
            await bulkUpsertGraphCache(cacheBatch);
          }
        } catch (err) {
          log.error(
            "Error fetching batch",
            err instanceof Error ? err : new Error(String(err)),
            {
              batchStart: i,
              batchEnd: i + batchSize,
            },
          );
          // Продолжаем с следующим батчем
        }
      }

      fetchedPmids += batch.length;

      // Логируем и обновляем прогресс каждые 100 PMIDs или при завершении
      if (fetchedPmids % 100 === 0 || fetchedPmids === pmidsToFetch.length) {
        log.debug("Phase 2 progress", {
          fetchedPmids,
          totalPmids: pmidsToFetch.length,
          cachedFromDb,
          fetchedFromPubmed,
        });

        await updateProgress(jobId, {
          fetched_pmids: fetchedPmids,
          phase: "2 - Кэширование метаданных статей",
          phase_progress: `${fetchedPmids}/${pmidsToFetch.length} PMIDs (${cachedFromDb} из кэша, ${fetchedFromPubmed} загружено)`,
        });
      }
    }

    log.info("Phase 2 complete", { cachedFromDb, fetchedFromPubmed });

    // Проверяем отмену перед фазой 3
    if (await checkTimeoutAndCancellation()) return;

    // Фаза 3: Загружаем citation counts из Europe PMC (быстрее чем PubMed)
    const phase3PmidsCount = Math.min(pmids.length, 200);
    log.info("Phase 3 starting: fetching citation counts from Europe PMC", {
      articleCount: phase3PmidsCount,
    });

    await updateProgress(jobId, {
      phase: "3 - Загрузка счётчиков цитирований",
      phase_progress: `0/${phase3PmidsCount} статей`,
    });

    try {
      const citationCounts = await europePMCGetCitationCounts({
        pmids: pmids.slice(0, 200), // Ограничиваем для скорости
        throttleMs: 150,
      });

      const citationUpdates: CitationCountUpdate[] = [];
      for (const [pmid, count] of citationCounts) {
        const articleId = idByPmid.get(pmid);
        if (!articleId || count === 0) continue;
        citationUpdates.push({ id: articleId, count });
      }

      let appliedCitationUpdates = 0;
      for (const batch of chunkArray(
        citationUpdates,
        CITATION_COUNT_BATCH_SIZE,
      )) {
        if (await checkTimeoutAndCancellation()) return;
        await bulkUpdateCitationCounts(batch);
        appliedCitationUpdates += batch.length;

        // Обновляем прогресс каждые 20 статей
        if (
          appliedCitationUpdates % 20 === 0 ||
          appliedCitationUpdates === citationUpdates.length
        ) {
          await updateProgress(jobId, {
            phase: "3 - Загрузка счётчиков цитирований",
            phase_progress: `${appliedCitationUpdates}/${phase3PmidsCount} статей`,
          });
        }
      }
      log.info("Phase 3 complete: updated citation counts", {
        updatedArticles: appliedCitationUpdates,
      });
    } catch (err) {
      log.error(
        "Europe PMC error",
        err instanceof Error ? err : new Error(String(err)),
      );
    }

    // Проверяем отмену перед фазой 4
    if (await checkTimeoutAndCancellation()) return;

    // Фаза 4: Загружаем Crossref references для статей БЕЗ PMID (DOAJ, Wiley, Crossref)
    // Это позволяет строить связи для не-PubMed статей
    log.info(
      "Phase 4 starting: fetching Crossref references for non-PubMed articles",
    );

    await updateProgress(jobId, {
      phase: "4 - Загрузка Crossref references",
      phase_progress: "Поиск статей без PMID...",
    });

    try {
      // Получаем статьи проекта без PMID, но с DOI
      let doiSql = `SELECT a.id, a.doi, a.source
         FROM articles a
         JOIN project_articles pa ON pa.article_id = a.id
         WHERE pa.project_id = $1 
           AND a.pmid IS NULL 
           AND a.doi IS NOT NULL
           AND (a.reference_dois IS NULL OR array_length(a.reference_dois, 1) IS NULL OR a.references_fetched_at IS NULL)`;
      const doiParams: unknown[] = [projectId];

      // Фильтр по статусу (только отобранные)
      if (selectedOnly) {
        doiSql += ` AND pa.status = 'selected'`;
      }

      // Фильтр по конкретным статьям
      if (articleIds && articleIds.length > 0) {
        doiSql += ` AND a.id = ANY($2)`;
        doiParams.push(articleIds);
      }

      doiSql += ` LIMIT 100`; // Ограничиваем для скорости

      const doiArticles = await pool.query(doiSql, doiParams);

      log.info("Phase 4: found articles with DOI but no PMID", {
        count: doiArticles.rows.length,
      });

      let crossrefProcessed = 0;
      let crossrefWithRefs = 0;
      let totalCrossrefRefs = 0;
      const totalDoiArticles = doiArticles.rows.length;

      const doiRows = doiArticles.rows as DoiArticleRow[];
      for (const article of doiRows) {
        // Проверяем отмену каждые 5 статей
        if (
          crossrefProcessed % 5 === 0 &&
          (await checkTimeoutAndCancellation())
        )
          return;

        try {
          // Throttle для Crossref API (polite pool)
          await new Promise((resolve) => setTimeout(resolve, 200));

          const crossrefData = await getCrossrefByDOI(article.doi);
          if (!crossrefData) {
            crossrefProcessed++;
            continue;
          }

          const enriched = extractEnrichedData(crossrefData);

          // Извлекаем DOIs из references
          const referenceDois: string[] = [];
          if (enriched.references) {
            for (const ref of enriched.references) {
              if (ref.doi) {
                referenceDois.push(ref.doi.toLowerCase());
              }
            }
          }

          // Обновляем статью
          await pool.query(
            `UPDATE articles SET 
              reference_dois = $1::text[],
              crossref_cited_by_count = $2,
              references_fetched_at = now(),
              raw_json = COALESCE(raw_json, '{}'::jsonb) || jsonb_build_object(
                'crossref', $3::jsonb,
                'crossrefCitedByCount', $2
              )
             WHERE id = $4`,
            [
              referenceDois,
              enriched.citedByCount || 0,
              JSON.stringify({
                referencesCount: enriched.referencesCount,
                publisher: enriched.publisher,
                subjects: enriched.subjects,
              }),
              article.id,
            ],
          );

          if (referenceDois.length > 0) {
            crossrefWithRefs++;
            totalCrossrefRefs += referenceDois.length;
          }

          crossrefProcessed++;

          if (crossrefProcessed % 10 === 0) {
            log.debug("Phase 4 progress", {
              crossrefProcessed,
              totalDoiArticles,
              crossrefWithRefs,
            });
            await updateProgress(jobId, {
              phase: "4 - Загрузка Crossref references",
              phase_progress: `${crossrefProcessed}/${totalDoiArticles} статей (${crossrefWithRefs} с ссылками)`,
            });
          }
        } catch (err) {
          log.error(
            "Crossref error for DOI",
            err instanceof Error ? err : new Error(String(err)),
            { doi: article.doi },
          );
          crossrefProcessed++;
        }
      }

      log.info("Phase 4 complete", {
        crossrefWithRefs,
        crossrefProcessed,
        totalCrossrefRefs,
      });
    } catch (err) {
      log.error(
        "Phase 4 Crossref error",
        err instanceof Error ? err : new Error(String(err)),
      );
    }

    // Завершаем job успешно
    const elapsedMs = Date.now() - startTime;

    await pool.query(
      `UPDATE graph_fetch_jobs SET 
        status = 'completed', 
        completed_at = now(),
        last_progress_at = now(),
        processed_articles = $1,
        fetched_pmids = $2,
        error_message = NULL
       WHERE id = $3`,
      [processedArticles, fetchedPmids, jobId],
    );

    log.info("Job completed successfully", {
      jobId,
      processedArticles,
      fetchedPmids,
      durationMs: elapsedMs,
    });

    if (autoPipeline) {
      try {
        await enqueueAutoEmbeddingsJob(payload);
      } catch (enqueueErr) {
        log.error(
          "Auto-pipeline enqueue failed after graph completion",
          enqueueErr instanceof Error
            ? enqueueErr
            : new Error(String(enqueueErr)),
          { jobId, projectId },
        );
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(
      "Job failed",
      err instanceof Error ? err : new Error(errorMessage),
      { jobId },
    );

    await pool.query(
      `UPDATE graph_fetch_jobs SET 
        status = 'failed', 
        completed_at = now(),
        last_progress_at = now(),
        error_message = $1
       WHERE id = $2`,
      [errorMessage || "Unknown error", jobId],
    );
  }
}
