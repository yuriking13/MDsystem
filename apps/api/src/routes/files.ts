/**
 * API routes for project file management
 */

import { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
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
      const userId = (req as any).user.sub;

      const { projectId } = req.params;
      const { category } = req.query;

      const access = await checkProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return reply.forbidden("You don't have access to this project");
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

      return {
        files: files.map((f) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          sizeFormatted: formatFileSize(f.size),
          category: f.category,
          description: f.description,
          uploadedBy: f.uploader?.email || null,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        })),
        storageConfigured: isStorageConfigured(),
      };
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
      const userId = (req as any).user.sub;

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
      const userId = (req as any).user.sub;

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
      const userId = (req as any).user.sub;

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
      const userId = (req as any).user.sub;

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
      const userId = (req as any).user.sub;

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
      const userId = (req as any).user.sub;

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

      return { ok: true };
    }
  );
};

export default filesRoutes;
