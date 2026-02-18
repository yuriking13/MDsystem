import { pool } from "../../pg.js";
import { logError } from "../../utils/errors.js";
import { NotFoundError } from "../../utils/typed-errors.js";

type LoggerLike = {
  error: (obj: object, msg: string) => void;
};

export type DocumentVersionType = "manual" | "auto" | "exit";

export type AutoVersionDecision = {
  shouldCreate: boolean;
  reason?: string;
};

type LastVersionRow = {
  content_hash: string | null;
  content_length: number | null;
  created_at: string | Date;
};

type DocumentRow = {
  title: string | null;
  content: string | null;
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function isMissingDocumentVersionsTableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const msg = error.message.toLowerCase();
  return (
    msg.includes("does not exist") &&
    (msg.includes("document_versions") || msg.includes("relation"))
  );
}

export async function shouldCreateAutoVersion(
  docId: string,
  newContent: string,
  logger?: LoggerLike,
): Promise<AutoVersionDecision> {
  try {
    const lastVersionResult = await pool.query(
      `SELECT content_hash, content_length, created_at
       FROM document_versions
       WHERE document_id = $1
       ORDER BY version_number DESC
       LIMIT 1`,
      [docId],
    );

    if (lastVersionResult.rowCount === 0) {
      return { shouldCreate: true, reason: "first_version" };
    }

    const last = lastVersionResult.rows[0] as LastVersionRow;
    const now = new Date();
    const lastVersionTime = new Date(last.created_at);
    const timeDiffMinutes =
      (now.getTime() - lastVersionTime.getTime()) / (1000 * 60);

    if (timeDiffMinutes > 30) {
      return { shouldCreate: true, reason: "time_threshold" };
    }

    const newLength = newContent.length;
    const oldLength = last.content_length || 0;
    const lengthDiff = Math.abs(newLength - oldLength);
    const changePercent = oldLength > 0 ? (lengthDiff / oldLength) * 100 : 100;

    if (changePercent > 20) {
      return { shouldCreate: true, reason: "significant_change" };
    }

    const newHash = simpleHash(newContent);
    if (last.content_hash !== newHash && timeDiffMinutes > 5) {
      return { shouldCreate: true, reason: "content_changed" };
    }

    return { shouldCreate: false };
  } catch (error) {
    if (logger) {
      logError(logger, "documents.versioning.shouldCreateAutoVersion", error, {
        docId,
      });
    }
    return { shouldCreate: false };
  }
}

export async function createDocumentVersion(
  docId: string,
  userId: string,
  versionType: DocumentVersionType = "auto",
  versionNote?: string,
): Promise<Record<string, unknown>> {
  const docResult = await pool.query(
    `SELECT title, content FROM documents WHERE id = $1`,
    [docId],
  );

  if (docResult.rowCount === 0) {
    throw new NotFoundError("Document");
  }

  const { title, content } = docResult.rows[0] as DocumentRow;
  const normalizedContent = content || "";
  const contentHash = simpleHash(normalizedContent);
  const contentLength = normalizedContent.length;

  const nextNumResult = await pool.query(
    `SELECT COALESCE(MAX(version_number), 0) + 1 as next_num
     FROM document_versions WHERE document_id = $1`,
    [docId],
  );
  const versionNumber = nextNumResult.rows[0].next_num;

  const versionResult = await pool.query(
    `INSERT INTO document_versions
     (document_id, content, title, version_number, version_type, version_note, content_length, content_hash, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      docId,
      normalizedContent,
      title,
      versionNumber,
      versionType,
      versionNote || null,
      contentLength,
      contentHash,
      userId,
    ],
  );

  await pool.query(
    `UPDATE documents SET last_version_at = NOW() WHERE id = $1`,
    [docId],
  );

  return versionResult.rows[0] as Record<string, unknown>;
}
