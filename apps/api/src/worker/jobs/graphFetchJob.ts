import { pool } from '../../pg.js';
import { enrichArticlesWithReferences, pubmedFetchByPmids, europePMCGetCitationCounts } from '../../lib/pubmed.js';
import { decryptApiKey } from '../../utils/apiKeyCrypto.js';
import { getCrossrefByDOI, extractEnrichedData } from '../../lib/crossref.js';

// Поfлучаесм API кDалюч пользователя из бВазы
async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
  const result = await pool.query(
    `SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );
  if (result.rows.length === 0) return null;
  return decryptApiKey(result.rows[0].encrypted_key);
}

export type GraphFetchJobPayload = {
  projectId: string;
  jobId: string;
  userId: string;
  selectedOnly?: boolean; // Загружать связи только для отобранных статей
  articleIds?: string[] | null; // Загружать связи только для указанных статей
};

export async function runGraphFetchJob(payload: GraphFetchJobPayload) {
  const { projectId, jobId, userId, selectedOnly, articleIds } = payload;
  
  console.log(`[GraphFetch] Starting job ${jobId} for project ${projectId}, userId: ${userId}, selectedOnly: ${selectedOnly}, articleIds: ${articleIds?.length || 0}`);
  
  try {
    console.log(`[GraphFetch] Updating job status to 'running'`);
    // Обновляем статус на running
    await pool.query(
      `UPDATE graph_fetch_jobs SET status = 'running', started_at = now() WHERE id = $1`,
      [jobId]
    );
    console.log(`[GraphFetch] Job status updated, fetching articles...`);
    
    // Получаем API ключ пользователя
    const apiKey = await getUserApiKey(userId, 'pubmed');
    
    // Получаем статьи проекта с PMID (с учётом фильтров)
    let sql = `SELECT a.id, a.pmid, a.reference_pmids, a.cited_by_pmids
       FROM articles a
       JOIN project_articles pa ON pa.article_id = a.id
       WHERE pa.project_id = $1 AND a.pmid IS NOT NULL`;
    const params: any[] = [projectId];
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
    
    const articles = articlesRes.rows;
    const totalArticles = articles.length;
    
    await pool.query(
      `UPDATE graph_fetch_jobs SET total_articles = $1 WHERE id = $2`,
      [totalArticles, jobId]
    );
    
    if (totalArticles === 0) {
      await pool.query(
        `UPDATE graph_fetch_jobs SET status = 'completed', completed_at = now() WHERE id = $1`,
        [jobId]
      );
      return;
    }
    
    // Фаза 1: Загружаем references и cited_by для статей проекта
    const pmids = articles.map((a: { pmid: string | null }) => a.pmid).filter(Boolean) as string[];
    const idByPmid = new Map<string, string>();
    for (const row of articles) {
      idByPmid.set(row.pmid, row.id);
    }
    
    // Получаем references из PubMed
    const refsMap = await enrichArticlesWithReferences({
      apiKey: apiKey || undefined,
      pmids,
      throttleMs: apiKey ? 100 : 350,
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
      
      console.log(`[GraphFetch] Article ${pmid}: ${refs.references.length} refs, ${refs.citedBy.length} cited_by`);
      
      // Обновляем статью
      // Убедимся что массивы корректные
      const refArray = Array.isArray(refs.references) ? refs.references : [];
      const citedByArray = Array.isArray(refs.citedBy) ? refs.citedBy : [];
      
      // Логируем первые несколько референсов для отладки
      if (refArray.length > 0 && processedArticles < 3) {
        console.log(`[GraphFetch] Sample refs for ${pmid}: ${refArray.slice(0, 5).join(', ')}${refArray.length > 5 ? '...' : ''}`);
      }
      
      await pool.query(
        `UPDATE articles SET 
          reference_pmids = $1::text[],
          cited_by_pmids = $2::text[],
          references_fetched_at = now()
         WHERE id = $3`,
        [refArray, citedByArray, articleId]
      );
      
      // Verify the update worked
      if (processedArticles === 0) {
        const verifyRes = await pool.query(
          `SELECT reference_pmids, array_length(reference_pmids, 1) as ref_count 
           FROM articles WHERE id = $1`,
          [articleId]
        );
        console.log(`[GraphFetch] Verify first article saved: ref_count=${verifyRes.rows[0]?.ref_count || 0}`);
      }
      
      // Добавляем PMIDs в список для кэширования
      refs.references.forEach(p => allPmidsToCache.add(p));
      refs.citedBy.forEach(p => allPmidsToCache.add(p));
      
      processedArticles++;
      
      // Обновляем прогресс каждые 10 статей
      if (processedArticles % 10 === 0) {
        await pool.query(
          `UPDATE graph_fetch_jobs SET processed_articles = $1 WHERE id = $2`,
          [processedArticles, jobId]
        );
      }
    }
    
    console.log(`[GraphFetch] Phase 1 complete: ${articlesWithReferences}/${processedArticles} articles have references (${totalReferencesFound} total), ${articlesWithCitedBy} have cited_by (${totalCitedByFound} total)`);
    
    // Фаза 2: Кэшируем информацию о связанных статьях
    const pmidsToFetch = Array.from(allPmidsToCache);
    
    console.log(`[GraphFetch] Phase 2 starting: ${pmidsToFetch.length} unique PMIDs to cache`);
    
    await pool.query(
      `UPDATE graph_fetch_jobs SET 
        processed_articles = $1, 
        total_pmids_to_fetch = $2 
       WHERE id = $3`,
      [processedArticles, pmidsToFetch.length, jobId]
    );
    
    // Загружаем информацию батчами
    const batchSize = 50;
    let fetchedPmids = 0;
    let cachedFromDb = 0;
    let fetchedFromPubmed = 0;
    
    for (let i = 0; i < pmidsToFetch.length; i += batchSize) {
      const batch = pmidsToFetch.slice(i, i + batchSize);
      
      // Проверяем какие уже есть в кэше (не истёкшие)
      const existingRes = await pool.query(
        `SELECT pmid FROM graph_cache 
         WHERE pmid = ANY($1) AND (expires_at IS NULL OR expires_at > now())`,
        [batch]
      );
      const existingPmids = new Set(existingRes.rows.map((r: { pmid: string }) => r.pmid));
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
          
          // Сохраняем в кэш
          for (const article of fetched) {
            const firstAuthor = (article.authors || '').split(',')[0]?.trim() || 'Unknown';
            
            await pool.query(
              `INSERT INTO graph_cache (pmid, title, authors, year, doi, project_id, fetched_at, expires_at)
               VALUES ($1, $2, $3, $4, $5, $6, now(), now() + interval '30 days')
               ON CONFLICT (pmid) DO UPDATE SET
                 title = EXCLUDED.title,
                 authors = EXCLUDED.authors,
                 year = EXCLUDED.year,
                 doi = EXCLUDED.doi,
                 fetched_at = now(),
                 expires_at = now() + interval '30 days'`,
              [article.pmid, article.title, firstAuthor, article.year, article.doi, projectId]
            );
          }
        } catch (err) {
          console.error(`[GraphFetch] Error fetching batch ${i}-${i+batchSize}:`, err);
          // Продолжаем с следующим батчем
        }
      }
      
      fetchedPmids += batch.length;
      
      // Логируем прогресс каждые 200 PMIDs
      if (fetchedPmids % 200 === 0 || fetchedPmids === pmidsToFetch.length) {
        console.log(`[GraphFetch] Phase 2 progress: ${fetchedPmids}/${pmidsToFetch.length} PMIDs (${cachedFromDb} cached, ${fetchedFromPubmed} fetched)`);
      }
      
      // Обновляем прогресс
      await pool.query(
        `UPDATE graph_fetch_jobs SET fetched_pmids = $1 WHERE id = $2`,
        [fetchedPmids, jobId]
      );
    }
    
    console.log(`[GraphFetch] Phase 2 complete: ${cachedFromDb} PMIDs from cache, ${fetchedFromPubmed} fetched from PubMed`);
    
    // Фаза 3: Загружаем citation counts из Europe PMC (быстрее чем PubMed)
    console.log(`[GraphFetch] Phase 3 starting: fetching citation counts from Europe PMC for ${Math.min(pmids.length, 200)} articles`);
    try {
      const citationCounts = await europePMCGetCitationCounts({
        pmids: pmids.slice(0, 200), // Ограничиваем для скорости
        throttleMs: 150,
      });
      
      let citationUpdates = 0;
      for (const [pmid, count] of citationCounts) {
        const articleId = idByPmid.get(pmid);
        if (!articleId || count === 0) continue;
        
        await pool.query(
          `UPDATE articles SET 
            raw_json = COALESCE(raw_json, '{}'::jsonb) || jsonb_build_object('europePMCCitations', $1)
           WHERE id = $2`,
          [count, articleId]
        );
        citationUpdates++;
      }
      console.log(`[GraphFetch] Phase 3 complete: updated citation counts for ${citationUpdates} articles`);
    } catch (err) {
      console.error('[GraphFetch] Europe PMC error:', err);
    }
    
    // Фаза 4: Загружаем Crossref references для статей БЕЗ PMID (DOAJ, Wiley, Crossref)
    // Это позволяет строить связи для не-PubMed статей
    console.log(`[GraphFetch] Phase 4 starting: fetching Crossref references for non-PubMed articles`);
    try {
      // Получаем статьи проекта без PMID, но с DOI
      let doiSql = `SELECT a.id, a.doi, a.source
         FROM articles a
         JOIN project_articles pa ON pa.article_id = a.id
         WHERE pa.project_id = $1 
           AND a.pmid IS NULL 
           AND a.doi IS NOT NULL
           AND (a.reference_dois IS NULL OR array_length(a.reference_dois, 1) IS NULL OR a.references_fetched_at IS NULL)`;
      const doiParams: any[] = [projectId];
      
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
      
      console.log(`[GraphFetch] Phase 4: found ${doiArticles.rows.length} articles with DOI but no PMID`);
      
      let crossrefProcessed = 0;
      let crossrefWithRefs = 0;
      let totalCrossrefRefs = 0;
      
      for (const article of doiArticles.rows) {
        try {
          // Throttle для Crossref API (polite pool)
          await new Promise(resolve => setTimeout(resolve, 200));
          
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
              article.id
            ]
          );
          
          if (referenceDois.length > 0) {
            crossrefWithRefs++;
            totalCrossrefRefs += referenceDois.length;
          }
          
          crossrefProcessed++;
          
          if (crossrefProcessed % 10 === 0) {
            console.log(`[GraphFetch] Phase 4 progress: ${crossrefProcessed}/${doiArticles.rows.length} DOI articles`);
          }
        } catch (err) {
          console.error(`[GraphFetch] Crossref error for DOI ${article.doi}:`, err);
        }
      }
      
      console.log(`[GraphFetch] Phase 4 complete: ${crossrefWithRefs}/${crossrefProcessed} articles have Crossref references (${totalCrossrefRefs} total refs)`);
    } catch (err) {
      console.error('[GraphFetch] Phase 4 Crossref error:', err);
    }
    
    // Завершаем job
    await pool.query(
      `UPDATE graph_fetch_jobs SET 
        status = 'completed', 
        completed_at = now(),
        processed_articles = $1,
        fetched_pmids = $2
       WHERE id = $3`,
      [processedArticles, fetchedPmids, jobId]
    );
    
    console.log(`[GraphFetch] Completed job ${jobId}: ${processedArticles} articles, ${fetchedPmids} cached PMIDs`);
    
  } catch (err: any) {
    console.error(`[GraphFetch] Job ${jobId} failed:`, err);
    
    await pool.query(
      `UPDATE graph_fetch_jobs SET 
        status = 'failed', 
        completed_at = now(),
        error_message = $1
       WHERE id = $2`,
      [err?.message || 'Unknown error', jobId]
    );
  }
}
