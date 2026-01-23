/**
 * Оптимизированные batch-операции для работы со статьями
 * Заменяет N+1 запросы на единичные batch операции
 */

import { pool } from "../pg.js";
import { extractStats, hasAnyStats, calculateStatsQuality } from "../lib/stats.js";

export interface ArticleData {
  doi?: string | null;
  pmid?: string | null;
  title: string;
  abstract?: string | null;
  authors?: string | null;
  journal?: string | null;
  year?: number | null;
  url: string;
  source: string;
  studyTypes?: string[];
  keywords?: string[];
}

export interface BatchArticleResult {
  articleId: string;
  isNew: boolean;
}

/**
 * Найти существующие статьи по PMID или DOI (batch)
 * Возвращает Map<identifier, articleId>
 */
export async function findExistingArticlesBatch(
  pmids: string[],
  dois: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  // Batch запрос для PMID
  if (pmids.length > 0) {
    const pmidRes = await pool.query(
      `SELECT id, pmid FROM articles WHERE pmid = ANY($1)`,
      [pmids]
    );
    for (const row of pmidRes.rows) {
      results.set(`pmid:${row.pmid}`, row.id);
    }
  }
  
  // Batch запрос для DOI
  if (dois.length > 0) {
    const normalizedDois = dois.map(d => d.toLowerCase());
    const doiRes = await pool.query(
      `SELECT id, doi FROM articles WHERE doi = ANY($1)`,
      [normalizedDois]
    );
    for (const row of doiRes.rows) {
      results.set(`doi:${row.doi}`, row.id);
    }
  }
  
  return results;
}

/**
 * Bulk insert статей (одним запросом)
 * Возвращает Map<tempId, articleId>
 */
export async function insertArticlesBatch(
  articles: Array<ArticleData & { tempId: string }>
): Promise<Map<string, string>> {
  if (articles.length === 0) return new Map();
  
  const results = new Map<string, string>();
  
  // Подготовка данных для UNNEST
  const doisArr: (string | null)[] = [];
  const pmidsArr: (string | null)[] = [];
  const titlesArr: string[] = [];
  const abstractsArr: (string | null)[] = [];
  const authorsArr: (string[] | null)[] = [];
  const yearsArr: (number | null)[] = [];
  const journalsArr: (string | null)[] = [];
  const urlsArr: string[] = [];
  const sourcesArr: string[] = [];
  const hasStatsArr: boolean[] = [];
  const statsJsonArr: (string | null)[] = [];
  const statsQualityArr: number[] = [];
  const pubTypesArr: (string[] | null)[] = [];
  const tempIds: string[] = [];
  
  for (const article of articles) {
    const stats = extractStats(article.abstract);
    const hasStats = hasAnyStats(stats);
    const statsQuality = hasStats ? calculateStatsQuality(stats) : 0;
    const authorsArray = article.authors 
      ? article.authors.split(",").map(a => a.trim()).filter(Boolean)
      : null;
    
    doisArr.push(article.doi?.toLowerCase() || null);
    pmidsArr.push(article.pmid || null);
    titlesArr.push(article.title);
    abstractsArr.push(article.abstract || null);
    authorsArr.push(authorsArray);
    yearsArr.push(article.year || null);
    journalsArr.push(article.journal || null);
    urlsArr.push(article.url);
    sourcesArr.push(article.source);
    hasStatsArr.push(hasStats);
    statsJsonArr.push(hasStats ? JSON.stringify(stats) : null);
    statsQualityArr.push(statsQuality);
    pubTypesArr.push(article.studyTypes?.length ? article.studyTypes : null);
    tempIds.push(article.tempId);
  }
  
  // Batch INSERT с ON CONFLICT
  const res = await pool.query(
    `WITH input AS (
      SELECT 
        unnest($1::text[]) as doi,
        unnest($2::text[]) as pmid,
        unnest($3::text[]) as title_en,
        unnest($4::text[]) as abstract_en,
        unnest($5::text[][]) as authors,
        unnest($6::int[]) as year,
        unnest($7::text[]) as journal,
        unnest($8::text[]) as url,
        unnest($9::text[]) as source,
        unnest($10::boolean[]) as has_stats,
        unnest($11::jsonb[]) as stats_json,
        unnest($12::int[]) as stats_quality,
        unnest($13::text[][]) as publication_types,
        unnest($14::text[]) as temp_id
    ),
    inserted AS (
      INSERT INTO articles (doi, pmid, title_en, abstract_en, authors, year, journal, url, source, has_stats, stats_json, stats_quality, publication_types, created_at)
      SELECT doi, pmid, title_en, abstract_en, authors, year, journal, url, source, has_stats, stats_json::jsonb, stats_quality, publication_types, now()
      FROM input
      ON CONFLICT (doi) DO UPDATE SET updated_at = now()
      RETURNING id, doi, pmid
    )
    SELECT i.temp_id, COALESCE(ins.id, 
      (SELECT id FROM articles WHERE (articles.doi = i.doi AND i.doi IS NOT NULL) OR (articles.pmid = i.pmid AND i.pmid IS NOT NULL) LIMIT 1)
    ) as article_id
    FROM input i
    LEFT JOIN inserted ins ON (ins.doi = i.doi OR ins.pmid = i.pmid)`,
    [
      doisArr,
      pmidsArr,
      titlesArr,
      abstractsArr,
      authorsArr,
      yearsArr,
      journalsArr,
      urlsArr,
      sourcesArr,
      hasStatsArr,
      statsJsonArr,
      statsQualityArr,
      pubTypesArr,
      tempIds,
    ]
  );
  
  for (const row of res.rows) {
    if (row.article_id) {
      results.set(row.temp_id, row.article_id);
    }
  }
  
  return results;
}

/**
 * Bulk add статей в проект (одним запросом)
 */
export async function addArticlesToProjectBatch(
  projectId: string,
  articleIds: string[],
  userId: string,
  sourceQuery?: string,
  status: "candidate" | "selected" = "candidate"
): Promise<{ added: number; skipped: number }> {
  if (articleIds.length === 0) return { added: 0, skipped: 0 };
  
  // Используем INSERT ... ON CONFLICT DO NOTHING для дедупликации
  const res = await pool.query(
    `INSERT INTO project_articles (project_id, article_id, status, added_by, source_query)
     SELECT $1, unnest($2::uuid[]), $3, $4, $5
     ON CONFLICT (project_id, article_id) DO NOTHING`,
    [projectId, articleIds, status, userId, sourceQuery || null]
  );
  
  const added = res.rowCount ?? 0;
  const skipped = articleIds.length - added;
  
  return { added, skipped };
}

/**
 * Bulk обновление статусов статей в проекте
 */
export async function updateArticleStatusBatch(
  projectId: string,
  articleIds: string[],
  status: string,
  notes?: string
): Promise<number> {
  if (articleIds.length === 0) return 0;
  
  const res = await pool.query(
    `UPDATE project_articles 
     SET status = $3, notes = COALESCE($4, notes)
     WHERE project_id = $1 AND article_id = ANY($2)`,
    [projectId, articleIds, status, notes || null]
  );
  
  return res.rowCount ?? 0;
}

/**
 * Получить статьи проекта с фильтрацией (оптимизированный запрос)
 */
export async function getProjectArticlesBatch(
  projectId: string,
  options: {
    status?: string;
    hasStats?: boolean;
    yearFrom?: number;
    yearTo?: number;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{ articles: unknown[]; total: number }> {
  const { 
    status, 
    hasStats, 
    yearFrom, 
    yearTo, 
    search,
    limit = 20, 
    offset = 0,
    sortBy = 'added_at',
    sortOrder = 'desc'
  } = options;
  
  // Строим WHERE условия
  const conditions: string[] = ['pa.project_id = $1'];
  const params: unknown[] = [projectId];
  let paramIdx = 2;
  
  if (status) {
    conditions.push(`pa.status = $${paramIdx++}`);
    params.push(status);
  }
  
  if (hasStats !== undefined) {
    conditions.push(`a.has_stats = $${paramIdx++}`);
    params.push(hasStats);
  }
  
  if (yearFrom) {
    conditions.push(`a.year >= $${paramIdx++}`);
    params.push(yearFrom);
  }
  
  if (yearTo) {
    conditions.push(`a.year <= $${paramIdx++}`);
    params.push(yearTo);
  }
  
  if (search) {
    conditions.push(`(
      a.title_en ILIKE $${paramIdx} OR 
      a.title_ru ILIKE $${paramIdx} OR 
      a.abstract_en ILIKE $${paramIdx} OR
      array_to_string(a.authors, ' ') ILIKE $${paramIdx}
    )`);
    params.push(`%${search}%`);
    paramIdx++;
  }
  
  const whereClause = conditions.join(' AND ');
  
  // Allowed sort columns
  const sortColumns: Record<string, string> = {
    'added_at': 'pa.added_at',
    'year': 'a.year',
    'title': 'a.title_en',
    'stats_quality': 'a.stats_quality',
    'status': 'pa.status',
  };
  const orderColumn = sortColumns[sortBy] || 'pa.added_at';
  const orderDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
  
  // Count query
  const countRes = await pool.query(
    `SELECT COUNT(*) as cnt 
     FROM project_articles pa
     JOIN articles a ON a.id = pa.article_id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].cnt);
  
  // Data query with pagination
  params.push(limit, offset);
  const dataRes = await pool.query(
    `SELECT 
       a.id, a.doi, a.pmid, a.title_en, a.title_ru, a.abstract_en, a.abstract_ru,
       a.authors, a.year, a.journal, a.url, a.source, a.has_stats, a.stats_quality,
       a.publication_types, a.volume, a.issue, a.pages,
       pa.status, pa.notes, pa.tags, pa.added_at, pa.source_query
     FROM project_articles pa
     JOIN articles a ON a.id = pa.article_id
     WHERE ${whereClause}
     ORDER BY ${orderColumn} ${orderDir} NULLS LAST
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    params
  );
  
  return { articles: dataRes.rows, total };
}

/**
 * Проверить существование статей в проекте (batch)
 */
export async function checkArticlesInProjectBatch(
  projectId: string,
  articleIds: string[]
): Promise<Set<string>> {
  if (articleIds.length === 0) return new Set();
  
  const res = await pool.query(
    `SELECT article_id FROM project_articles 
     WHERE project_id = $1 AND article_id = ANY($2)`,
    [projectId, articleIds]
  );
  
  return new Set(res.rows.map(r => r.article_id));
}
