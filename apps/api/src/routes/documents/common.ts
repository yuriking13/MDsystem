import { z } from "zod";
import { pool } from "../../pg.js";

// === Zod Schemas ===

export const ProjectIdSchema = z.object({
  projectId: z.string().uuid(),
});

export const DocumentIdSchema = z.object({
  projectId: z.string().uuid(),
  docId: z.string().uuid(),
});

export const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const CitationIdSchema = z.object({
  projectId: z.string().uuid(),
  docId: z.string().uuid(),
  citationId: z.string().uuid(),
});

export const VersionIdSchema = z.object({
  projectId: z.string().uuid(),
  docId: z.string().uuid(),
  versionId: z.string().uuid(),
});

// === Helper Functions ===

/**
 * Проверка доступа к проекту
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

/**
 * Simple hash function for content comparison (document versioning)
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Константы для авто-версионирования
 */
export const VERSION_INTERVAL_MINUTES = 30;
export const VERSION_CONTENT_CHANGE_THRESHOLD = 0.1; // 10% изменений

/**
 * Check if we should auto-create a version based on time and content change
 */
export async function shouldAutoCreateVersion(
  docId: string,
  newContent: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT content, updated_at FROM documents WHERE id = $1`,
    [docId],
  );

  if (result.rowCount === 0) return false;

  const { content: oldContent, updated_at: updatedAt } = result.rows[0];

  // Check time since last update
  const minutesSinceUpdate =
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60);
  if (minutesSinceUpdate < VERSION_INTERVAL_MINUTES) {
    return false;
  }

  // Check content change threshold
  if (!oldContent || !newContent) return true;

  const oldLen = oldContent.length;
  const newLen = newContent.length;
  const changeRatio = Math.abs(newLen - oldLen) / Math.max(oldLen, 1);

  return changeRatio > VERSION_CONTENT_CHANGE_THRESHOLD;
}

/**
 * Create a document version
 */
export async function createDocumentVersion(
  docId: string,
  userId: string,
  isManual = false,
): Promise<{ id: string; version_number: number } | null> {
  // Get current document state
  const docResult = await pool.query(
    `SELECT title, content FROM documents WHERE id = $1`,
    [docId],
  );

  if (docResult.rowCount === 0) return null;

  const { title, content } = docResult.rows[0];

  // Get next version number
  const versionResult = await pool.query(
    `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version 
     FROM document_versions WHERE document_id = $1`,
    [docId],
  );

  const nextVersion = versionResult.rows[0].next_version;
  const contentHash = simpleHash(content || "");

  // Create version
  const insertResult = await pool.query(
    `INSERT INTO document_versions 
     (document_id, version_number, title, content, content_hash, created_by, is_manual)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, version_number`,
    [docId, nextVersion, title, content, contentHash, userId, isManual],
  );

  return insertResult.rows[0];
}
