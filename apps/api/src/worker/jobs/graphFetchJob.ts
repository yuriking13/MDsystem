import { pool } from '../../pg.js';
import { enrichArticlesWithReferences, pubmedFetchByPmids, europePMCGetCitationCounts } from '../../lib/pubmed.js';
import { decryptApiKey } from '../../utils/apiKeyCrypto.js';

// Поfлучаем API ключ пользователя из базы
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
};

export async function runGraphFetchJob(payload: GraphFetchJobPayload) {
  const { projectId, jobId, userId } = payload;
  
  console.log(`[GraphFetch] Starting job ${jobId} for project ${projectId}`);
  
  try {
    // Обновляем статус на running
    await pool.query(
      `UPDATE graph_fetch_jobs SET status = 'running', started_at = now() WHERE id = $1`,
      [jobId]
    );
    
    // Получаем API ключ пользователя
    const apiKey = await getUserApiKey(userId, 'pubmed');
    
    // Получаем статьи проекта с PMID
    const articlesRes = await pool.query(
      `SELECT a.id, a.pmid, a.reference_pmids, a.cited_by_pmids
       FROM articles a
       JOIN project_articles pa ON pa.article_id = a.id
       WHERE pa.project_id = $1 AND a.pmid IS NOT NULL`,
      [projectId]
    );
    
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
    let processedArticles = 0;
    for (const [pmid, refs] of refsMap) {
      const articleId = idByPmid.get(pmid);
      if (!articleId) continue;
      
      // Обновляем статью
      await pool.query(
        `UPDATE articles SET 
          reference_pmids = $1,
          cited_by_pmids = $2,
          references_fetched_at = now()
         WHERE id = $3`,
        [refs.references, refs.citedBy, articleId]
      );
      
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
    
    // Фаза 2: Кэшируем информацию о связанных статьях
    const pmidsToFetch = Array.from(allPmidsToCache);
    
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
    
    for (let i = 0; i < pmidsToFetch.length; i += batchSize) {
      const batch = pmidsToFetch.slice(i, i + batchSize);
      
      // Проверяем какие уже есть в кэше (не истёкшие)
      const existingRes = await pool.query(
        `SELECT pmid FROM graph_cache 
         WHERE pmid = ANY($1) AND (expires_at IS NULL OR expires_at > now())`,
        [batch]
      );
      const existingPmids = new Set(existingRes.rows.map((r: { pmid: string }) => r.pmid));
      const toFetch = batch.filter((p: string) => !existingPmids.has(p));
      
      if (toFetch.length > 0) {
        try {
          // Загружаем из PubMed
          const fetched = await pubmedFetchByPmids({
            pmids: toFetch,
            apiKey: apiKey || undefined,
            throttleMs: apiKey ? 80 : 300,
          });
          
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
          console.error(`[GraphFetch] Error fetching batch:`, err);
          // Продолжаем с следующим батчем
        }
      }
      
      fetchedPmids += batch.length;
      
      // Обновляем прогресс
      await pool.query(
        `UPDATE graph_fetch_jobs SET fetched_pmids = $1 WHERE id = $2`,
        [fetchedPmids, jobId]
      );
    }
    
    // Фаза 3: Загружаем citation counts из Europe PMC (быстрее чем PubMed)
    try {
      const citationCounts = await europePMCGetCitationCounts({
        pmids: pmids.slice(0, 200), // Ограничиваем для скорости
        throttleMs: 150,
      });
      
      for (const [pmid, count] of citationCounts) {
        const articleId = idByPmid.get(pmid);
        if (!articleId || count === 0) continue;
        
        await pool.query(
          `UPDATE articles SET 
            raw_json = COALESCE(raw_json, '{}'::jsonb) || jsonb_build_object('europePMCCitations', $1)
           WHERE id = $2`,
          [count, articleId]
        );
      }
    } catch (err) {
      console.error('[GraphFetch] Europe PMC error:', err);
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
