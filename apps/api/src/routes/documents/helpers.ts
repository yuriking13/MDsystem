import { pool } from "../../pg.js";

// ==================== PROJECT ACCESS CHECK ====================

/**
 * Проверка доступа пользователя к проекту
 * @param projectId - ID проекта
 * @param userId - ID пользователя
 * @param requireEdit - требуется ли редактирование (viewer запрещён)
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string,
  requireEdit = false,
): Promise<{ ok: boolean; role?: string }> {
  const res = await pool.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  if (res.rowCount === 0) return { ok: false };
  const role = res.rows[0].role;
  if (requireEdit && role === "viewer") return { ok: false, role };
  return { ok: true, role };
}

// ==================== CONTENT HASHING ====================

/**
 * Simple hash function for content comparison
 * Used for auto-versioning decision
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// ==================== COLUMN EXISTENCE CHECKS ====================

/**
 * Проверяет наличие колонки sub_number в таблице citations
 */
export async function hasSubNumberColumn(): Promise<boolean> {
  try {
    const checkCol = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'citations' AND column_name = 'sub_number'`,
    );
    return (checkCol.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Проверяет наличие колонок volume/issue/pages в таблице articles
 */
export async function hasVolumeColumns(): Promise<boolean> {
  try {
    const checkCol = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'articles' AND column_name = 'volume'`,
    );
    return (checkCol.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

// ==================== DEDUPLICATION HELPERS ====================

/**
 * Получить ключ дедупликации для статьи
 * Приоритет: PMID > базовый DOI (без версий) > нормализованный title
 */
export function getDedupeKey(article: {
  pmid?: string | null;
  doi?: string | null;
  title_en?: string | null;
  id?: string;
  article_id?: string;
}): string {
  if (article.pmid) {
    return `pmid:${article.pmid}`;
  }
  if (article.doi) {
    // Нормализуем DOI: убираем версии типа /v1/review2, /v2/decision1 и т.д.
    const baseDoi = article.doi.replace(/\/v\d+\/.*$/, "").toLowerCase();
    return `doi:${baseDoi}`;
  }
  if (article.title_en) {
    // Нормализуем title: lowercase, убираем пунктуацию
    const normalizedTitle = article.title_en
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim();
    return `title:${normalizedTitle}`;
  }
  // Fallback на article_id
  return `id:${article.id || article.article_id || "unknown"}`;
}

// ==================== XML ESCAPE ====================

/**
 * Escape XML special characters
 */
export function escapeXml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
