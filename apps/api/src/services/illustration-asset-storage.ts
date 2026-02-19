import { prisma } from "../db.js";
import { invalidateFiles } from "../lib/redis.js";
import {
  deleteFile,
  generateStoragePath,
  isStorageConfigured,
  uploadFile,
} from "../lib/storage.js";
import { sanitizeAndValidateSvg } from "../lib/svg-sanitizer.js";

export class IllustrationPersistenceError extends Error {
  constructor(
    public readonly code:
      | "STORAGE_NOT_CONFIGURED"
      | "SVG_SANITIZATION_FAILED"
      | "ASSET_UPLOAD_FAILED"
      | "DB_WRITE_FAILED",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "IllustrationPersistenceError";
  }
}

export type PersistedIllustrationAsset = {
  projectFile: {
    id: string;
    name: string;
    mimeType: string;
    category: "image";
  };
  sanitizedSvg: string;
};

function toSafeFileSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "ai-illustration"
  );
}

export async function persistGeneratedIllustrationAsset(params: {
  projectId: string;
  userId: string;
  title: string;
  description: string;
  svgCode: string;
}): Promise<PersistedIllustrationAsset> {
  if (!isStorageConfigured()) {
    throw new IllustrationPersistenceError(
      "STORAGE_NOT_CONFIGURED",
      "File storage is not configured",
    );
  }

  const sanitized = sanitizeAndValidateSvg(params.svgCode);
  if (!sanitized.ok) {
    throw new IllustrationPersistenceError(
      "SVG_SANITIZATION_FAILED",
      "Generated SVG failed server-side security validation",
      sanitized.reason,
    );
  }

  const storagePath = generateStoragePath(params.projectId, "svg");
  const svgBuffer = Buffer.from(sanitized.sanitizedSvg, "utf8");
  const generatedFileName = `${toSafeFileSlug(params.title)}-${Date.now()}.svg`;

  try {
    await uploadFile(storagePath, svgBuffer, "image/svg+xml");
  } catch (error) {
    throw new IllustrationPersistenceError(
      "ASSET_UPLOAD_FAILED",
      "Failed to upload generated illustration",
      error instanceof Error ? error.message : String(error),
    );
  }

  try {
    const file = await prisma.projectFile.create({
      data: {
        projectId: params.projectId,
        name: generatedFileName,
        storagePath,
        mimeType: "image/svg+xml",
        size: svgBuffer.length,
        category: "image",
        description: params.description.slice(0, 2000),
        uploadedBy: params.userId,
      },
    });

    await invalidateFiles(params.projectId);

    return {
      projectFile: {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        category: "image",
      },
      sanitizedSvg: sanitized.sanitizedSvg,
    };
  } catch (error) {
    try {
      await deleteFile(storagePath);
    } catch {
      // If cleanup fails, original DB error is still the primary failure.
    }

    throw new IllustrationPersistenceError(
      "DB_WRITE_FAILED",
      "Failed to persist generated illustration metadata",
      error instanceof Error ? error.message : String(error),
    );
  }
}
