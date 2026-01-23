/**
 * Prepared Statements для часто используемых запросов
 * Ускоряет выполнение за счёт кэширования плана запроса в PostgreSQL
 * 
 * Используйте эти функции вместо прямых pool.query() для hot paths
 */

import { pool } from "../pg.js";

// ============================================================
// Prepared statements для articles
// ============================================================

/**
 * Найти статью по PMID
 */
export async function findArticleByPmid(pmid: string) {
  const res = await pool.query({
    name: 'find_article_by_pmid',
    text: 'SELECT id, publication_types FROM articles WHERE pmid = $1',
    values: [pmid],
  });
  return res.rows[0] || null;
}

/**
 * Найти статью по DOI
 */
export async function findArticleByDoi(doi: string) {
  const res = await pool.query({
    name: 'find_article_by_doi',
    text: 'SELECT id, publication_types FROM articles WHERE doi = $1',
    values: [doi.toLowerCase()],
  });
  return res.rows[0] || null;
}

/**
 * Проверить существование статьи в проекте
 */
export async function checkArticleInProject(projectId: string, articleId: string): Promise<boolean> {
  const res = await pool.query({
    name: 'check_article_in_project',
    text: 'SELECT 1 FROM project_articles WHERE project_id = $1 AND article_id = $2',
    values: [projectId, articleId],
  });
  return (res.rowCount ?? 0) > 0;
}

/**
 * Получить роль пользователя в проекте
 */
export async function getProjectMemberRole(projectId: string, userId: string): Promise<string | null> {
  const res = await pool.query({
    name: 'get_project_member_role',
    text: 'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    values: [projectId, userId],
  });
  return res.rows[0]?.role || null;
}

/**
 * Получить количество статей в проекте по статусу
 */
export async function countProjectArticlesByStatus(projectId: string, status?: string): Promise<number> {
  if (status) {
    const res = await pool.query({
      name: 'count_project_articles_by_status',
      text: 'SELECT COUNT(*) as cnt FROM project_articles WHERE project_id = $1 AND status = $2',
      values: [projectId, status],
    });
    return parseInt(res.rows[0].cnt);
  } else {
    const res = await pool.query({
      name: 'count_project_articles_all',
      text: 'SELECT COUNT(*) as cnt FROM project_articles WHERE project_id = $1',
      values: [projectId],
    });
    return parseInt(res.rows[0].cnt);
  }
}

/**
 * Получить список документов проекта
 */
export async function getProjectDocuments(projectId: string) {
  const res = await pool.query({
    name: 'get_project_documents',
    text: `SELECT id, title, parent_id, order_index, created_at, updated_at
           FROM documents
           WHERE project_id = $1
           ORDER BY order_index, created_at`,
    values: [projectId],
  });
  return res.rows;
}

/**
 * Получить документ по ID
 */
export async function getDocumentById(docId: string, projectId: string) {
  const res = await pool.query({
    name: 'get_document_by_id',
    text: `SELECT * FROM documents WHERE id = $1 AND project_id = $2`,
    values: [docId, projectId],
  });
  return res.rows[0] || null;
}

/**
 * Получить цитаты документа
 */
export async function getDocumentCitations(documentId: string) {
  const res = await pool.query({
    name: 'get_document_citations',
    text: `SELECT c.id, c.article_id, c.order_index, c.inline_number, c.page_range, c.note,
           json_build_object(
             'id', a.id, 'title_en', a.title_en, 'title_ru', a.title_ru,
             'authors', a.authors, 'year', a.year, 'journal', a.journal,
             'doi', a.doi, 'pmid', a.pmid
           ) as article
           FROM citations c
           JOIN articles a ON a.id = c.article_id
           WHERE c.document_id = $1
           ORDER BY c.inline_number, c.order_index`,
    values: [documentId],
  });
  return res.rows;
}

/**
 * Получить API ключ пользователя
 */
export async function getUserApiKeyEncrypted(userId: string, provider: string): Promise<string | null> {
  const res = await pool.query({
    name: 'get_user_api_key',
    text: 'SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND provider = $2',
    values: [userId, provider],
  });
  return res.rows[0]?.encrypted_key || null;
}

/**
 * Получить статистику проекта
 */
export async function getProjectStatistics(projectId: string) {
  const res = await pool.query({
    name: 'get_project_statistics',
    text: `SELECT * FROM project_statistics WHERE project_id = $1 ORDER BY order_index`,
    values: [projectId],
  });
  return res.rows;
}

/**
 * Получить файлы проекта
 */
export async function getProjectFiles(projectId: string, category?: string) {
  if (category) {
    const res = await pool.query({
      name: 'get_project_files_by_category',
      text: `SELECT * FROM project_files WHERE project_id = $1 AND category = $2 ORDER BY created_at DESC`,
      values: [projectId, category],
    });
    return res.rows;
  } else {
    const res = await pool.query({
      name: 'get_project_files_all',
      text: `SELECT * FROM project_files WHERE project_id = $1 ORDER BY created_at DESC`,
      values: [projectId],
    });
    return res.rows;
  }
}

// ============================================================
// Bulk операции с prepared statements
// ============================================================

/**
 * Добавить статью в проект
 */
export async function insertProjectArticle(
  projectId: string,
  articleId: string,
  status: string,
  addedBy: string,
  sourceQuery?: string
): Promise<boolean> {
  try {
    await pool.query({
      name: 'insert_project_article',
      text: `INSERT INTO project_articles (project_id, article_id, status, added_by, source_query)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (project_id, article_id) DO NOTHING`,
      values: [projectId, articleId, status, addedBy, sourceQuery || null],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Обновить статус статьи в проекте
 */
export async function updateProjectArticleStatus(
  projectId: string,
  articleId: string,
  status: string,
  notes?: string
): Promise<boolean> {
  const res = await pool.query({
    name: 'update_project_article_status',
    text: `UPDATE project_articles SET status = $3, notes = COALESCE($4, notes)
           WHERE project_id = $1 AND article_id = $2`,
    values: [projectId, articleId, status, notes || null],
  });
  return (res.rowCount ?? 0) > 0;
}

/**
 * Получить активный graph fetch job для проекта
 */
export async function getActiveGraphJob(projectId: string) {
  const res = await pool.query({
    name: 'get_active_graph_job',
    text: `SELECT id FROM graph_fetch_jobs 
           WHERE project_id = $1 AND status IN ('pending', 'running')
           LIMIT 1`,
    values: [projectId],
  });
  return res.rows[0] || null;
}

/**
 * Получить последний graph fetch job
 */
export async function getLastGraphJob(projectId: string) {
  const res = await pool.query({
    name: 'get_last_graph_job',
    text: `SELECT * FROM graph_fetch_jobs 
           WHERE project_id = $1 
           ORDER BY created_at DESC 
           LIMIT 1`,
    values: [projectId],
  });
  return res.rows[0] || null;
}
