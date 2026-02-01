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

// ==================== ARTICLE DEDUPLICATION ====================

/**
 * Проверка дубликата статьи в проекте по PMID или DOI
 * @returns true если дубликат найден
 */
export async function checkArticleDuplicate(
  projectId: string,
  pmid?: string | null,
  doi?: string | null,
): Promise<{ isDuplicate: boolean; existingId?: string }> {
  if (!pmid && !doi) {
    return { isDuplicate: false };
  }

  let query = `
    SELECT a.id FROM articles a
    JOIN project_articles pa ON pa.article_id = a.id
    WHERE pa.project_id = $1 AND pa.status != 'deleted'
  `;
  const params: (string | null)[] = [projectId];
  let paramIdx = 2;

  const conditions: string[] = [];
  if (pmid) {
    conditions.push(`a.pmid = $${paramIdx++}`);
    params.push(pmid);
  }
  if (doi) {
    conditions.push(`LOWER(a.doi) = LOWER($${paramIdx++})`);
    params.push(doi);
  }

  if (conditions.length > 0) {
    query += ` AND (${conditions.join(" OR ")})`;
  }

  query += " LIMIT 1";

  const res = await pool.query(query, params);
  if (res.rowCount && res.rowCount > 0) {
    return { isDuplicate: true, existingId: res.rows[0].id };
  }
  return { isDuplicate: false };
}

// ==================== COLUMN EXISTENCE CHECKS ====================

/**
 * Проверяет наличие колонки в таблице
 */
export async function hasColumn(
  tableName: string,
  columnName: string,
): Promise<boolean> {
  try {
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = $1 AND column_name = $2`,
      [tableName, columnName],
    );
    return (res.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

// ==================== ARTICLE FORMATTING ====================

/**
 * Формирует имя первого автора для отображения
 */
export function getFirstAuthorLabel(authors: string[] | null): string {
  if (!authors || authors.length === 0) return "Unknown";
  const firstAuthor = authors[0];
  // Берём фамилию (обычно первое слово до запятой или пробела)
  const lastName = firstAuthor.split(/[,\s]/)[0];
  return lastName || "Unknown";
}

/**
 * Формирует label для статьи (FirstAuthor (Year))
 */
export function formatArticleLabel(
  authors: string[] | null,
  year: number | null,
): string {
  const authorPart = getFirstAuthorLabel(authors);
  const yearPart = year || "?";
  return `${authorPart} (${yearPart})`;
}
