import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { pool } from "../../pg.js";
import { invalidateDocuments, invalidateDocument } from "../../lib/redis.js";
import { getUserId } from "../../utils/auth-helpers.js";
import { logError } from "../../utils/errors.js";
import {
  AuthorizationError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from "../../utils/typed-errors.js";
import { DocumentIdSchema, VersionCreateSchema } from "./types.js";
import {
  createDocumentVersion,
  isMissingDocumentVersionsTableError,
  shouldCreateAutoVersion,
} from "./versioning-service.js";

type CheckProjectAccessFn = (
  projectId: string,
  userId: string,
  requireEdit?: boolean,
) => Promise<{ ok: boolean; role?: string }>;

const VersionIdParamsSchema = DocumentIdSchema.extend({
  versionId: z.string().uuid(),
});

const AutoVersionBodySchema = z.object({
  content: z.string().optional(),
});

export async function registerDocumentVersionRoutes(
  fastify: FastifyInstance,
  deps: { checkProjectAccess: CheckProjectAccessFn },
): Promise<void> {
  const { checkProjectAccess } = deps;

  fastify.get(
    "/projects/:projectId/documents/:docId/versions",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = getUserId(request);
      const paramsP = DocumentIdSchema.safeParse(request.params);

      if (!paramsP.success) {
        throw new ValidationError("Invalid params", paramsP.error.issues);
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId);
      if (!access.ok) {
        throw new AuthorizationError("No access");
      }

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
      } catch (error) {
        if (isMissingDocumentVersionsTableError(error)) {
          return { versions: [], tableNotReady: true };
        }
        throw error;
      }
    },
  );

  fastify.get(
    "/projects/:projectId/documents/:docId/versions/:versionId",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = getUserId(request);
      const paramsP = VersionIdParamsSchema.safeParse(request.params);

      if (!paramsP.success) {
        throw new ValidationError("Invalid params", paramsP.error.issues);
      }

      const access = await checkProjectAccess(paramsP.data.projectId, userId);
      if (!access.ok) {
        throw new AuthorizationError("No access");
      }

      const version = await pool.query(
        `SELECT * FROM document_versions
         WHERE id = $1 AND document_id = $2`,
        [paramsP.data.versionId, paramsP.data.docId],
      );

      if (version.rowCount === 0) {
        throw new NotFoundError("Version");
      }

      return { version: version.rows[0] };
    },
  );

  fastify.post(
    "/projects/:projectId/documents/:docId/versions",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = getUserId(request);
      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        throw new ValidationError("Invalid params", paramsP.error.issues);
      }

      const bodyP = VersionCreateSchema.safeParse(request.body ?? {});
      if (!bodyP.success) {
        throw new ValidationError("Invalid body", bodyP.error.issues);
      }

      const access = await checkProjectAccess(
        paramsP.data.projectId,
        userId,
        true,
      );
      if (!access.ok) {
        throw new AuthorizationError("No edit access");
      }

      try {
        const version = await createDocumentVersion(
          paramsP.data.docId,
          userId,
          bodyP.data.versionType,
          bodyP.data.versionNote,
        );
        return { version };
      } catch (error) {
        if (isMissingDocumentVersionsTableError(error)) {
          throw new ServiceUnavailableError("Versioning not available yet");
        }
        throw error;
      }
    },
  );

  fastify.post(
    "/projects/:projectId/documents/:docId/versions/:versionId/restore",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = getUserId(request);
      const paramsP = VersionIdParamsSchema.safeParse(request.params);
      if (!paramsP.success) {
        throw new ValidationError("Invalid params", paramsP.error.issues);
      }

      const access = await checkProjectAccess(
        paramsP.data.projectId,
        userId,
        true,
      );
      if (!access.ok) {
        throw new AuthorizationError("No edit access");
      }

      const version = await pool.query(
        `SELECT content, title FROM document_versions
         WHERE id = $1 AND document_id = $2`,
        [paramsP.data.versionId, paramsP.data.docId],
      );

      if (version.rowCount === 0) {
        throw new NotFoundError("Version");
      }

      const { content, title } = version.rows[0] as {
        content: string | null;
        title: string | null;
      };

      try {
        await createDocumentVersion(
          paramsP.data.docId,
          userId,
          "auto",
          "Автоматическое сохранение перед восстановлением",
        );
      } catch (error) {
        logError(
          fastify.log,
          "documents.versioning.preRestoreSnapshot",
          error,
          {
            projectId: paramsP.data.projectId,
            docId: paramsP.data.docId,
            versionId: paramsP.data.versionId,
          },
        );
      }

      await pool.query(
        `UPDATE documents SET content = $1, title = $2, updated_at = NOW() WHERE id = $3`,
        [content, title, paramsP.data.docId],
      );

      await invalidateDocument(paramsP.data.projectId, paramsP.data.docId);
      await invalidateDocuments(paramsP.data.projectId);

      return {
        success: true,
        message: "Document restored to selected version",
        restoredContent: content,
        restoredTitle: title,
      };
    },
  );

  fastify.post(
    "/projects/:projectId/documents/:docId/auto-version",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = getUserId(request);
      const paramsP = DocumentIdSchema.safeParse(request.params);
      if (!paramsP.success) {
        throw new ValidationError("Invalid params", paramsP.error.issues);
      }

      const bodyP = AutoVersionBodySchema.safeParse(request.body ?? {});
      if (!bodyP.success) {
        throw new ValidationError("Invalid body", bodyP.error.issues);
      }

      const access = await checkProjectAccess(
        paramsP.data.projectId,
        userId,
        true,
      );
      if (!access.ok) {
        throw new AuthorizationError("No edit access");
      }

      try {
        const { shouldCreate, reason } = await shouldCreateAutoVersion(
          paramsP.data.docId,
          bodyP.data.content || "",
          fastify.log,
        );

        if (!shouldCreate) {
          return { created: false };
        }

        const version = await createDocumentVersion(
          paramsP.data.docId,
          userId,
          "auto",
          `Автосохранение (${reason})`,
        );
        return { created: true, version, reason };
      } catch (error) {
        if (isMissingDocumentVersionsTableError(error)) {
          return { created: false, tableNotReady: true };
        }
        throw error;
      }
    },
  );
}
