import type { FastifyPluginAsync } from "fastify";
import { pool } from "../../pg.js";
import { invalidateDocuments, invalidateDocument } from "../../lib/redis.js";
import { getUserId } from "../../utils/auth-helpers.js";
import { DocumentIdSchema, VersionCreateSchema } from "./types.js";
import { checkProjectAccess, simpleHash } from "./helpers.js";

/**
 * Document versioning plugin
 * Handles: list versions, get version, create version, restore version, auto-version
 */
const versionsPlugin: FastifyPluginAsync = async (fastify) => {
  // Helper: Check if we should auto-create a version
  async function shouldCreateAutoVersion(
    docId: string,
    newContent: string,
  ): Promise<{ shouldCreate: boolean; reason?: string }> {
    try {
      // Get the last version for this document
      const lastVersion = await pool.query(
        `SELECT content_hash, content_length, created_at 
         FROM document_versions 
         WHERE document_id = $1 
         ORDER BY version_number DESC 
         LIMIT 1`,
        [docId],
      );

      if (lastVersion.rowCount === 0) {
        // No versions yet, create one
        return { shouldCreate: true, reason: "first_version" };
      }

      const last = lastVersion.rows[0];
      const now = new Date();
      const lastVersionTime = new Date(last.created_at);
      const timeDiffMinutes =
        (now.getTime() - lastVersionTime.getTime()) / (1000 * 60);

      // Time-based: create version if more than 30 minutes since last version
      if (timeDiffMinutes > 30) {
        return { shouldCreate: true, reason: "time_threshold" };
      }

      // Content-based: create version if content changed significantly (>20% change)
      const newLength = newContent?.length || 0;
      const oldLength = last.content_length || 0;
      const lengthDiff = Math.abs(newLength - oldLength);
      const changePercent =
        oldLength > 0 ? (lengthDiff / oldLength) * 100 : 100;

      if (changePercent > 20) {
        return { shouldCreate: true, reason: "significant_change" };
      }

      // Hash-based: check if content actually changed
      const newHash = simpleHash(newContent || "");
      if (last.content_hash !== newHash && timeDiffMinutes > 5) {
        // Content changed and at least 5 minutes passed
        return { shouldCreate: true, reason: "content_changed" };
      }

      return { shouldCreate: false };
    } catch (e) {
      console.error("Error checking auto-version:", e);
      return { shouldCreate: false };
    }
  }

  // Helper: Create a document version
  async function createDocumentVersion(
    docId: string,
    userId: string,
    versionType: "manual" | "auto" | "exit" = "auto",
    versionNote?: string,
  ): Promise<Record<string, unknown>> {
    // Get current document content
    const doc = await pool.query(
      `SELECT title, content FROM documents WHERE id = $1`,
      [docId],
    );

    if (doc.rowCount === 0) {
      throw new Error("Document not found");
    }

    const { title, content } = doc.rows[0];
    const contentHash = simpleHash(content || "");
    const contentLength = content?.length || 0;

    // Get next version number
    const nextNumResult = await pool.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 as next_num 
       FROM document_versions WHERE document_id = $1`,
      [docId],
    );
    const versionNumber = nextNumResult.rows[0].next_num;

    // Create version
    const version = await pool.query(
      `INSERT INTO document_versions 
       (document_id, content, title, version_number, version_type, version_note, content_length, content_hash, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        docId,
        content,
        title,
        versionNumber,
        versionType,
        versionNote || null,
        contentLength,
        contentHash,
        userId,
      ],
    );

    // Update document's last_version_at
    await pool.query(
      `UPDATE documents SET last_version_at = NOW() WHERE id = $1`,
      [docId],
    );

    return version.rows[0];
  }

  // GET /api/projects/:projectId/documents/:docId/versions - list versions
  fastify.get(
    "/projects/:projectId/documents/:docId/versions",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "No access" });
      }

      // Check if document_versions table exists
      try {
        const versions = await pool.query(
          `SELECT id, version_number, version_type, version_note, content_length, created_at, 
                  (SELECT email FROM users WHERE id = created_by) as created_by_email
           FROM document_versions 
           WHERE document_id = $1 
           ORDER BY version_number DESC
           LIMIT 50`,
          [paramsP.data.docId],
        );

        return { versions: versions.rows };
      } catch (e: unknown) {
        // Table doesn't exist yet
        const err = e as { message?: string };
        if (err.message?.includes("does not exist")) {
          return { versions: [], tableNotReady: true };
        }
        throw e;
      }
    },
  );

  // GET /api/projects/:projectId/documents/:docId/versions/:versionId - get specific version
  fastify.get(
    "/projects/:projectId/documents/:docId/versions/:versionId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const params = request.params as {
        projectId: string;
        docId: string;
        versionId: string;
      };

      const access = await checkProjectAccess(params.projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "No access" });
      }

      const version = await pool.query(
        `SELECT * FROM document_versions 
         WHERE id = $1 AND document_id = $2`,
        [params.versionId, params.docId],
      );

      if (version.rowCount === 0) {
        return reply.code(404).send({ error: "Version not found" });
      }

      return { version: version.rows[0] };
    },
  );

  // POST /api/projects/:projectId/documents/:docId/versions - create manual version
  fastify.post(
    "/projects/:projectId/documents/:docId/versions",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const bodyP = VersionCreateSchema.safeParse(request.body);

      const access = await checkProjectAccess(
        paramsP.data.projectId,
        userId,
        true,
      );
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      try {
        const version = await createDocumentVersion(
          paramsP.data.docId,
          userId,
          bodyP.success ? bodyP.data.versionType : "manual",
          bodyP.success ? bodyP.data.versionNote : undefined,
        );

        return { version };
      } catch (e: unknown) {
        // Table doesn't exist yet
        const err = e as { message?: string };
        if (err.message?.includes("does not exist")) {
          return reply.code(503).send({
            error: "Versioning not available yet",
            tableNotReady: true,
          });
        }
        throw e;
      }
    },
  );

  // POST /api/projects/:projectId/documents/:docId/versions/:versionId/restore - restore version
  fastify.post(
    "/projects/:projectId/documents/:docId/versions/:versionId/restore",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const params = request.params as {
        projectId: string;
        docId: string;
        versionId: string;
      };

      const access = await checkProjectAccess(params.projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      // Get the version to restore
      const version = await pool.query(
        `SELECT content, title FROM document_versions 
         WHERE id = $1 AND document_id = $2`,
        [params.versionId, params.docId],
      );

      if (version.rowCount === 0) {
        return reply.code(404).send({ error: "Version not found" });
      }

      const { content, title } = version.rows[0];

      // First, create a version of the current state (before restore)
      try {
        await createDocumentVersion(
          params.docId,
          userId,
          "auto",
          "Автоматическое сохранение перед восстановлением",
        );
      } catch (e) {
        console.warn("Could not create pre-restore version:", e);
      }

      // Restore the document
      await pool.query(
        `UPDATE documents SET content = $1, title = $2, updated_at = NOW() WHERE id = $3`,
        [content, title, params.docId],
      );

      // Invalidate cache
      await invalidateDocument(params.projectId, params.docId);
      await invalidateDocuments(params.projectId);

      return {
        success: true,
        message: "Document restored to selected version",
        restoredContent: content,
        restoredTitle: title,
      };
    },
  );

  // POST /api/projects/:projectId/documents/:docId/auto-version - trigger auto version check on save
  fastify.post(
    "/projects/:projectId/documents/:docId/auto-version",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);

      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        return reply.code(400).send({ error: "Invalid params" });
      }

      const body = request.body as { content?: string };

      const access = await checkProjectAccess(
        paramsP.data.projectId,
        userId,
        true,
      );
      if (!access.ok) {
        return reply.code(403).send({ error: "No edit access" });
      }

      try {
        const { shouldCreate, reason } = await shouldCreateAutoVersion(
          paramsP.data.docId,
          body.content || "",
        );

        if (shouldCreate) {
          const version = await createDocumentVersion(
            paramsP.data.docId,
            userId,
            "auto",
            `Автосохранение (${reason})`,
          );
          return { created: true, version, reason };
        }

        return { created: false };
      } catch (e: unknown) {
        // Table doesn't exist
        const err = e as { message?: string };
        if (err.message?.includes("does not exist")) {
          return { created: false, tableNotReady: true };
        }
        throw e;
      }
    },
  );
};

export default versionsPlugin;
