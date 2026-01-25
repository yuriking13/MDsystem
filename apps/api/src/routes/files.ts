/**
 * API routes for project file management
 */

import { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import { pool } from "../pg.js";
import { Prisma } from "@prisma/client";

// Infer types from Prisma schema
type ProjectFile = Prisma.ProjectFileGetPayload<object>;
type User = Prisma.UserGetPayload<object>;

import {
  isStorageConfigured,
  validateFileType,
  generateStoragePath,
  uploadFile,
  downloadFile,
  deleteFile,
  getSignedDownloadUrl,
  MAX_FILE_SIZE,
  getCategoryFromMimeType,
  formatFileSize,
  ALLOWED_MIME_TYPES,
} from "../lib/storage.js";
import {
  cacheGet,
  cacheSet,
  invalidateFiles,
  invalidateFile,
  invalidateArticles,
  CACHE_KEYS,
  TTL,
} from "../lib/redis.js";
import {
  extractTextFromFile,
  extractArticleMetadataWithAI,
  extractDoiFromText,
  extractHtmlFromWord,
  htmlToTiptapContent,
  type ExtractedArticle,
} from "../lib/article-extractor.js";
import { getUserId } from "../types/fastify.js";

const filesRoutes: FastifyPluginAsync = async (app) => {
  // Check if user has access to project
  async function checkProjectAccess(userId: string, projectId: string) {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true },
    });
    
    const isOwner = project?.createdBy === userId;
    const isMember = !!membership;
    const canEdit = isOwner || membership?.role === "editor";
    
    return { isOwner, isMember, canEdit, hasAccess: isOwner || isMember };
  }

  // GET /api/projects/:projectId/files - List project files
  app.get<{
    Params: { projectId: string };
    Querystring: { category?: string };
  }>(
    "/projects/:projectId/files",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);

      const { projectId } = req.params;
      const { category } = req.query;

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }

      // Try cache first (only for non-filtered requests)
      const cacheKey = CACHE_KEYS.files(projectId);
      if (!category) {
        const cached = await cacheGet<any>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const where: { projectId: string; category?: string } = { projectId };
      if (category) {
        where.category = category;
      }

      const files = await prisma.projectFile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          uploader: {
            select: { id: true, email: true },
          },
        },
      });

      const result = {
        files: files.map((f: ProjectFile & { uploader: Pick<User, 'id' | 'email'> | null }) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          sizeFormatted: formatFileSize(f.size),
          category: f.category,
          description: f.description,
          usedInDocuments: f.usedInDocuments || [],
          uploadedBy: f.uploader?.email || null,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        })),
        storageConfigured: isStorageConfigured(),
      };

      // Cache only non-filtered results
      if (!category) {
        await cacheSet(cacheKey, result, TTL.SHORT);
      }

      return result;
    }
  );

  // GET /api/storage/status - Check if storage is configured
  app.get(
    "/storage/status",
    { preHandler: [app.authenticate] },
    async () => {
      return {
        configured: isStorageConfigured(),
        maxFileSize: MAX_FILE_SIZE,
        maxFileSizeFormatted: formatFileSize(MAX_FILE_SIZE),
        allowedTypes: Object.keys(ALLOWED_MIME_TYPES),
      };
    }
  );

  // POST /api/projects/:projectId/files - Upload a file
  app.post<{
    Params: { projectId: string };
  }>(
    "/projects/:projectId/files",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);

      if (!isStorageConfigured()) {
        return reply.serviceUnavailable("File storage is not configured");
      }

      const { projectId } = req.params;

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }
      if (!access.canEdit) {
        return reply.forbidden("You don't have edit permissions for this project");
      }

      // Get multipart data
      const data = await req.file();
      if (!data) {
        return reply.badRequest("No file uploaded");
      }

      const { filename, mimetype } = data;

      // Validate file type
      const validation = validateFileType(mimetype);
      if (!validation.valid) {
        return reply.badRequest(`File type not allowed: ${mimetype}`);
      }

      // Read file into buffer
      const chunks: Buffer[] = [];
      let totalSize = 0;

      for await (const chunk of data.file) {
        totalSize += chunk.length;
        if (totalSize > MAX_FILE_SIZE) {
          return reply.badRequest(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
        }
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      // Generate storage path and upload
      const storagePath = generateStoragePath(projectId, validation.ext!);
      
      try {
        await uploadFile(storagePath, buffer, mimetype);
      } catch (err) {
        app.log.error({ err }, "Failed to upload file to S3");
        return reply.internalServerError("Failed to upload file");
      }

      // Save file record to database
      const file = await prisma.projectFile.create({
        data: {
          projectId,
          name: filename,
          storagePath,
          mimeType: mimetype,
          size: buffer.length,
          category: getCategoryFromMimeType(mimetype),
          uploadedBy: userId,
        },
      });

      // Invalidate files cache
      await invalidateFiles(projectId);

      return {
        file: {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          sizeFormatted: formatFileSize(file.size),
          category: file.category,
          createdAt: file.createdAt.toISOString(),
        },
      };
    }
  );

  // GET /api/projects/:projectId/files/:fileId - Get file info
  app.get<{
    Params: { projectId: string; fileId: string };
  }>(
    "/projects/:projectId/files/:fileId",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);

      const { projectId, fileId } = req.params;

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }

      const file = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId },
        include: {
          uploader: { select: { id: true, email: true } },
        },
      });

      if (!file) {
        return reply.notFound("File not found");
      }

      return {
        file: {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          sizeFormatted: formatFileSize(file.size),
          category: file.category,
          description: file.description,
          uploadedBy: file.uploader?.email || null,
          createdAt: file.createdAt.toISOString(),
          updatedAt: file.updatedAt.toISOString(),
        },
      };
    }
  );

  // GET /api/projects/:projectId/files/:fileId/download - Download file
  app.get<{
    Params: { projectId: string; fileId: string };
    Querystring: { redirect?: string };
  }>(
    "/projects/:projectId/files/:fileId/download",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);

      if (!isStorageConfigured()) {
        return reply.serviceUnavailable("File storage is not configured");
      }

      const { projectId, fileId } = req.params;
      const { redirect } = req.query;

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }

      const file = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId },
      });

      if (!file) {
        return reply.notFound("File not found");
      }

      // Option 1: Redirect to signed URL
      if (redirect === "true") {
        const signedUrl = await getSignedDownloadUrl(file.storagePath, file.name);
        return reply.redirect(signedUrl);
      }

      // Option 2: Stream through server
      try {
        const { buffer, contentType } = await downloadFile(file.storagePath);
        
        reply.header("Content-Type", contentType);
        reply.header("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
        reply.header("Content-Length", buffer.length);
        
        return reply.send(buffer);
      } catch (err) {
        app.log.error({ err }, "Failed to download file from S3");
        return reply.internalServerError("Failed to download file");
      }
    }
  );

  // GET /api/projects/:projectId/files/:fileId/url - Get signed download URL
  app.get<{
    Params: { projectId: string; fileId: string };
  }>(
    "/projects/:projectId/files/:fileId/url",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);

      if (!isStorageConfigured()) {
        return reply.serviceUnavailable("File storage is not configured");
      }

      const { projectId, fileId } = req.params;

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }

      const file = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId },
      });

      if (!file) {
        return reply.notFound("File not found");
      }

      const url = await getSignedDownloadUrl(file.storagePath, file.name);
      
      return { url, expiresIn: 3600 };
    }
  );

  // PATCH /api/projects/:projectId/files/:fileId - Update file metadata
  app.patch<{
    Params: { projectId: string; fileId: string };
    Body: { name?: string; description?: string };
  }>(
    "/projects/:projectId/files/:fileId",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);

      const { projectId, fileId } = req.params;
      const { name, description } = req.body;

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }
      if (!access.canEdit) {
        return reply.forbidden("You don't have edit permissions for this project");
      }

      const file = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId },
      });

      if (!file) {
        return reply.notFound("File not found");
      }

      const updated = await prisma.projectFile.update({
        where: { id: fileId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
        },
      });

      // Invalidate files cache
      await invalidateFile(projectId, fileId);

      return {
        file: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    }
  );

  // DELETE /api/projects/:projectId/files/:fileId - Delete file
  app.delete<{
    Params: { projectId: string; fileId: string };
  }>(
    "/projects/:projectId/files/:fileId",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);

      const { projectId, fileId } = req.params;

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }
      if (!access.canEdit) {
        return reply.forbidden("You don't have edit permissions for this project");
      }

      const file = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId },
      });

      if (!file) {
        return reply.notFound("File not found");
      }

      // Delete from S3 if storage is configured
      if (isStorageConfigured()) {
        try {
          await deleteFile(file.storagePath);
        } catch (err) {
          app.log.error({ err }, "Failed to delete file from S3, continuing with DB deletion");
        }
      }

      // Delete from database
      await prisma.projectFile.delete({
        where: { id: fileId },
      });

      // Invalidate files cache
      await invalidateFiles(projectId);

      return { ok: true };
    }
  );

  // POST /api/projects/:projectId/files/:fileId/use - Mark file as used in document
  app.post<{
    Params: { projectId: string; fileId: string };
    Body: { documentId: string };
  }>(
    "/projects/:projectId/files/:fileId/use",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      const { projectId, fileId } = req.params;
      const { documentId } = req.body;

      if (!documentId) {
        return reply.badRequest("documentId is required");
      }

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }

      const file = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId },
      });

      if (!file) {
        return reply.notFound("File not found");
      }

      // Add documentId to usedInDocuments if not already present
      const usedInDocuments = file.usedInDocuments || [];
      if (!usedInDocuments.includes(documentId)) {
        await prisma.projectFile.update({
          where: { id: fileId },
          data: {
            usedInDocuments: [...usedInDocuments, documentId],
          },
        });
        // Invalidate files cache
        await invalidateFile(projectId, fileId);
      }

      return { ok: true };
    }
  );

  // DELETE /api/projects/:projectId/files/:fileId/use - Unmark file usage in document
  app.delete<{
    Params: { projectId: string; fileId: string };
    Body: { documentId: string };
  }>(
    "/projects/:projectId/files/:fileId/use",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      const { projectId, fileId } = req.params;
      const { documentId } = req.body;

      if (!documentId) {
        return reply.badRequest("documentId is required");
      }

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }

      const file = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId },
      });

      if (!file) {
        return reply.notFound("File not found");
      }

      // Remove documentId from usedInDocuments
      const usedInDocuments = (file.usedInDocuments || []).filter(id => id !== documentId);
      await prisma.projectFile.update({
        where: { id: fileId },
        data: { usedInDocuments },
      });

      // Invalidate files cache
      await invalidateFile(projectId, fileId);

      return { ok: true };
    }
  );

  // POST /api/projects/:projectId/files/sync - Sync file usage with document content
  app.post<{
    Params: { projectId: string };
    Body: { documentId: string; fileIds: string[] };
  }>(
    "/projects/:projectId/files/sync",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      const { projectId } = req.params;
      const { documentId, fileIds } = req.body;

      if (!documentId) {
        return reply.badRequest("documentId is required");
      }

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }

      // Get all project files
      const allFiles = await prisma.projectFile.findMany({
        where: { projectId },
      });

      // Update each file's usedInDocuments
      let changedCount = 0;
      for (const file of allFiles) {
        const wasUsed = file.usedInDocuments.includes(documentId);
        const isUsed = fileIds.includes(file.id);

        if (wasUsed !== isUsed) {
          let newUsedInDocuments: string[];
          if (isUsed) {
            newUsedInDocuments = [...file.usedInDocuments, documentId];
          } else {
            newUsedInDocuments = file.usedInDocuments.filter(id => id !== documentId);
          }
          await prisma.projectFile.update({
            where: { id: file.id },
            data: { usedInDocuments: newUsedInDocuments },
          });
          changedCount++;
        }
      }

      // Invalidate files cache if anything changed
      if (changedCount > 0) {
        await invalidateFiles(projectId);
      }

      return { ok: true, synced: fileIds.length };
    }
  );

  // ============================================================
  // Article Import from Files
  // ============================================================

  // Helper to get user's OpenRouter API key
  async function getUserApiKey(userId: string, provider: string): Promise<string | null> {
    const res = await pool.query(
      `SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );
    if (res.rowCount === 0) return null;
    
    try {
      const { decryptApiKey } = await import("../utils/apiKeyCrypto.js");
      return decryptApiKey(res.rows[0].encrypted_key);
    } catch {
      return null;
    }
  }

  // POST /api/projects/:projectId/files/:fileId/analyze - Analyze file and extract article metadata
  app.post<{
    Params: { projectId: string; fileId: string };
    Querystring: { force?: string };
  }>(
    "/projects/:projectId/files/:fileId/analyze",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      const { projectId, fileId } = req.params;
      const forceReanalyze = req.query.force === "true";

      if (!isStorageConfigured()) {
        return reply.serviceUnavailable("File storage is not configured");
      }

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }

      // Get file info
      const file = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId },
      });

      if (!file) {
        return reply.notFound("File not found");
      }

      // Check if it's a document file (PDF or Word)
      if (file.category !== "document") {
        return reply.badRequest("Только PDF и Word документы могут быть проанализированы");
      }

      // Check for cached metadata (if not forcing re-analysis)
      // Use type assertion to access potentially missing fields
      const fileAny = file as any;
      const cachedMetadata = fileAny.extractedMetadata as ExtractedArticle | null | undefined;
      const cachedText = fileAny.extractedText as string | null | undefined;
      const cachedAt = fileAny.extractionDate as Date | null | undefined;
      
      if (!forceReanalyze && cachedMetadata && cachedText) {
        app.log.info(`Using cached metadata for file: ${file.name}`);
        return {
          ok: true,
          fileId,
          fileName: file.name,
          metadata: cachedMetadata,
          textPreview: cachedText.slice(0, 500) + 
            (cachedText.length > 500 ? "..." : ""),
          fullText: cachedText,
          cached: true,
          cachedAt: cachedAt,
        };
      }

      // Get OpenRouter API key
      const openrouterKey = await getUserApiKey(userId, "openrouter");
      if (!openrouterKey) {
        return reply.badRequest("OpenRouter API ключ не настроен. Добавьте его в настройках.");
      }

      try {
        // Download file from S3
        const { buffer } = await downloadFile(file.storagePath);

        // Extract text from file
        app.log.info(`Extracting text from file: ${file.name} (${file.mimeType})`);
        const text = await extractTextFromFile(buffer, file.mimeType);

        if (!text || text.trim().length < 100) {
          return reply.badRequest("Не удалось извлечь текст из файла или файл пустой");
        }

        // Try to extract DOI with regex first (prioritize header DOI)
        const regexDoi = extractDoiFromText(text, true);

        // Use AI to extract metadata
        app.log.info(`Analyzing file with AI: ${file.name}`);
        const metadata = await extractArticleMetadataWithAI(text, openrouterKey);

        // Use regex DOI if AI didn't find one (or AI got wrong DOI from bibliography)
        if (regexDoi && (!metadata.doi || metadata.doi !== regexDoi)) {
          // Prefer regex DOI from header as it's more reliable
          app.log.info(`Using regex DOI from header: ${regexDoi} (AI found: ${metadata.doi})`);
          metadata.doi = regexDoi;
        }

        // Cache the extracted metadata and text (gracefully handle if columns don't exist)
        try {
          await prisma.projectFile.update({
            where: { id: fileId },
            data: {
              extractedMetadata: metadata as any,
              extractedText: text,
              extractionDate: new Date(),
            } as any,
          });
          app.log.info(`Cached metadata for file: ${file.name}`);
        } catch (cacheErr) {
          app.log.warn({ err: cacheErr }, `Failed to cache metadata (columns may not exist yet): ${file.name}`);
        }

        return {
          ok: true,
          fileId,
          fileName: file.name,
          metadata,
          textPreview: text.slice(0, 500) + (text.length > 500 ? "..." : ""),
          fullText: text,
          cached: false,
        };
      } catch (err: any) {
        app.log.error({ err }, `Failed to analyze file: ${file.name}`);
        return reply.internalServerError(err.message || "Ошибка анализа файла");
      }
    }
  );

  // POST /api/projects/:projectId/files/:fileId/import-as-article - Import file as article
  app.post<{
    Params: { projectId: string; fileId: string };
    Body: {
      metadata: ExtractedArticle;
      status?: "selected" | "candidate";
    };
  }>(
    "/projects/:projectId/files/:fileId/import-as-article",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      const { projectId, fileId } = req.params;
      const { metadata, status = "selected" } = req.body;

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }
      if (!access.canEdit) {
        return reply.forbidden("You don't have edit permissions");
      }

      // Get file info
      const file = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId },
      });

      if (!file) {
        return reply.notFound("File not found");
      }

      if (!metadata || !metadata.title) {
        return reply.badRequest("Метаданные статьи обязательны (как минимум заголовок)");
      }

      try {
        // Check if article with this DOI already exists
        let articleId: string | null = null;
        
        if (metadata.doi) {
          const existingByDoi = await pool.query(
            `SELECT id FROM articles WHERE doi = $1`,
            [metadata.doi.toLowerCase()]
          );
          if ((existingByDoi.rowCount ?? 0) > 0) {
            articleId = existingByDoi.rows[0].id;
            app.log.info(`Found existing article by DOI: ${metadata.doi}`);
          }
        }

        // Create new article if not found
        if (!articleId) {
          const authors = metadata.authors || [];
          const biblioJson = metadata.bibliography ? JSON.stringify(metadata.bibliography) : null;
          
          const insertRes = await pool.query(
            `INSERT INTO articles (
              title_en, abstract_en, authors, year, journal, doi, url, source,
              volume, issue, pages, source_file_id, extracted_bibliography, is_from_file,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id`,
            [
              metadata.title,
              metadata.abstract || null,
              authors.length > 0 ? authors : null,
              metadata.year || null,
              metadata.journal || null,
              metadata.doi?.toLowerCase() || null,
              metadata.url || null,
              "file", // source = file
              metadata.volume || null,
              metadata.issue || null,
              metadata.pages || null,
              fileId, // source_file_id
              biblioJson,
              true, // is_from_file
              new Date(),
            ]
          );
          articleId = insertRes.rows[0].id;
          app.log.info(`Created new article from file: ${articleId}`);
        }

        // Check if article already in project
        const existingInProject = await pool.query(
          `SELECT 1 FROM project_articles WHERE project_id = $1 AND article_id = $2`,
          [projectId, articleId]
        );

        if ((existingInProject.rowCount ?? 0) > 0) {
          return {
            ok: true,
            articleId,
            message: "Статья уже добавлена в проект",
            isExisting: true,
          };
        }

        // Add to project with specified status
        await pool.query(
          `INSERT INTO project_articles (project_id, article_id, status, added_by, source_query, imported_from_file_id, file_import_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            projectId,
            articleId,
            status,
            userId,
            `Импорт из файла: ${file.name}`,
            fileId,
            new Date(),
          ]
        );

        // Invalidate caches
        await invalidateArticles(projectId);

        return {
          ok: true,
          articleId,
          message: `Статья "${metadata.title}" добавлена в ${status === "selected" ? "отобранные" : "кандидаты"}`,
          isExisting: false,
        };
      } catch (err: any) {
        app.log.error({ err }, "Failed to import article from file");
        return reply.internalServerError(err.message || "Ошибка импорта статьи");
      }
    }
  );

  // POST /api/projects/:projectId/files/:fileId/import-as-document - Import file as project document
  app.post<{
    Params: { projectId: string; fileId: string };
    Body: {
      metadata: ExtractedArticle;
      includeFullText?: boolean;
    };
  }>(
    "/projects/:projectId/files/:fileId/import-as-document",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = getUserId(req);
      const { projectId, fileId } = req.params;
      const { metadata, includeFullText = true } = req.body;

      if (!isStorageConfigured()) {
        return reply.serviceUnavailable("File storage is not configured");
      }

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
      }
      if (!access.canEdit) {
        return reply.forbidden("You don't have edit permissions");
      }

      // Get file info with cached text
      const file = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId },
      }) as (ProjectFile & { extractedText?: string | null }) | null;

      if (!file) {
        return reply.notFound("File not found");
      }

      if (!metadata || !metadata.title) {
        return reply.badRequest("Метаданные статьи обязательны (как минимум заголовок)");
      }

      try {
        // Get full text from cache or re-extract if needed
        let fullText = "";
        
        // Extract content with structure (HTML for Word, text for PDF)
        let structuredContent: unknown[] = [];
        
        if (includeFullText) {
          app.log.info(`Extracting content for document import: ${file.name} (storage: ${file.storagePath})`);
          try {
            const { buffer } = await downloadFile(file.storagePath);
            app.log.info(`Downloaded file ${file.name}, size: ${buffer.length} bytes`);
            
            // For Word files, use HTML extraction to preserve tables and structure
            const isWord = file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                           file.mimeType === "application/msword";
            
            if (isWord) {
              const html = await extractHtmlFromWord(buffer);
              app.log.info(`Extracted HTML from ${file.name}, length: ${html.length} chars`);
              structuredContent = htmlToTiptapContent(html);
              app.log.info(`Converted to TipTap: ${structuredContent.length} blocks`);
            } else {
              // For PDF, use text extraction
              fullText = await extractTextFromFile(buffer, file.mimeType);
              app.log.info(`Extracted text from ${file.name}, length: ${fullText.length} chars`);
              structuredContent = fullText.split(/\n\n+/).slice(0, 500).map(para => ({
                type: "paragraph",
                content: para.trim() ? [{ type: "text", text: para.trim() }] : [],
              }));
            }
          } catch (extractErr: any) {
            app.log.error({ err: extractErr }, `Failed to extract content from file: ${file.name}`);
          }
        }

        // Build document content - just add the extracted content directly
        // No need for metadata header since it's already in the file
        const documentContent = {
          type: "doc",
          content: structuredContent.length > 0 ? structuredContent : [
            {
              type: "paragraph",
              content: [{ type: "text", text: "[Не удалось извлечь содержимое файла]" }],
            },
          ],
        };

        // Create the document
        const docResult = await pool.query(
          `INSERT INTO documents (
            project_id, title, content, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $5)
          RETURNING id, title`,
          [
            projectId,
            metadata.title,
            JSON.stringify(documentContent),
            userId,
            new Date(),
          ]
        );

        const documentId = docResult.rows[0].id;

        // Link file to document
        await prisma.projectFile.update({
          where: { id: fileId },
          data: {
            usedInDocuments: {
              push: documentId,
            },
          },
        });

        app.log.info(`Created document from file: ${documentId}`);

        // Import bibliography references as articles and create citations
        let bibliographyCount = 0;
        const mainArticleDoi = metadata.doi?.toLowerCase();
        
        if (metadata.bibliography && metadata.bibliography.length > 0) {
          app.log.info(`Importing ${metadata.bibliography.length} bibliography references`);
          
          for (let i = 0; i < metadata.bibliography.length; i++) {
            const ref = metadata.bibliography[i];
            if (!ref.title && !ref.text) continue; // Skip empty refs
            
            // Skip if this reference is the main article itself (by DOI)
            if (ref.doi && mainArticleDoi && ref.doi.toLowerCase() === mainArticleDoi) {
              app.log.info(`Skipping self-reference: ${ref.doi}`);
              continue;
            }
            
            try {
              // Check if article with this DOI already exists
              let articleId: string | null = null;
              
              if (ref.doi) {
                const existingByDoi = await pool.query(
                  `SELECT id FROM articles WHERE doi = $1`,
                  [ref.doi.toLowerCase()]
                );
                if ((existingByDoi.rowCount ?? 0) > 0) {
                  articleId = existingByDoi.rows[0].id;
                }
              }
              
              // Create new article if not found
              if (!articleId) {
                const insertRes = await pool.query(
                  `INSERT INTO articles (
                    title_en, authors, year, journal, doi, source, created_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                  RETURNING id`,
                  [
                    ref.title || ref.text?.slice(0, 500) || "Без названия",
                    ref.authors ? [ref.authors] : null,
                    ref.year || null,
                    ref.journal || null,
                    ref.doi?.toLowerCase() || null,
                    "file_import",
                    new Date(),
                  ]
                );
                articleId = insertRes.rows[0].id;
              }
              
              // Create citation linking document to article
              await pool.query(
                `INSERT INTO citations (document_id, article_id, order_index, inline_number)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT DO NOTHING`,
                [documentId, articleId, i, i + 1]
              );
              
              bibliographyCount++;
            } catch (refErr: any) {
              app.log.warn({ err: refErr }, `Failed to import reference: ${ref.title || ref.text?.slice(0, 50)}`);
            }
          }
          
          app.log.info(`Imported ${bibliographyCount} bibliography references for document ${documentId}`);
        }

        return {
          ok: true,
          documentId,
          documentName: metadata.title,
          bibliographyCount,
          message: `Документ "${metadata.title}" создан из файла` + 
            (bibliographyCount > 0 ? `. Добавлено ${bibliographyCount} источников в библиографию.` : ""),
        };
      } catch (err: any) {
        app.log.error({ err }, "Failed to import file as document");
        return reply.internalServerError(err.message || "Ошибка создания документа");
      }
    }
  );
};

export default filesRoutes;
