/**
 * S3-compatible storage service for Yandex Object Storage
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";
import { randomUUID } from "crypto";

// Supported file types
export const ALLOWED_MIME_TYPES = {
  // Documents
  "application/pdf": { ext: "pdf", category: "document" },
  "application/msword": { ext: "doc", category: "document" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", category: "document" },
  "application/vnd.ms-excel": { ext: "xls", category: "document" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", category: "document" },
  // Images
  "image/jpeg": { ext: "jpg", category: "image" },
  "image/png": { ext: "png", category: "image" },
  "image/gif": { ext: "gif", category: "image" },
  "image/svg+xml": { ext: "svg", category: "image" },
  "image/webp": { ext: "webp", category: "image" },
  // Video
  "video/mp4": { ext: "mp4", category: "video" },
  "video/webm": { ext: "webm", category: "video" },
  // Audio
  "audio/mpeg": { ext: "mp3", category: "audio" },
  "audio/wav": { ext: "wav", category: "audio" },
  "audio/ogg": { ext: "ogg", category: "audio" },
} as const;

export type AllowedMimeType = keyof typeof ALLOWED_MIME_TYPES;
export type FileCategory = "document" | "image" | "video" | "audio" | "other";

// Max file size: 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

let s3Client: S3Client | null = null;

/**
 * Check if S3 storage is configured
 */
export function isStorageConfigured(): boolean {
  return !!(
    env.S3_ENDPOINT &&
    env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY &&
    env.S3_BUCKET_NAME
  );
}

/**
 * Get or create S3 client
 */
export function getS3Client(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error("S3 storage is not configured. Please set S3_* environment variables.");
  }

  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // Required for Yandex Object Storage
    });
  }

  return s3Client;
}

/**
 * Validate file type
 */
export function validateFileType(mimeType: string): { valid: boolean; ext?: string; category?: FileCategory } {
  const info = ALLOWED_MIME_TYPES[mimeType as AllowedMimeType];
  if (!info) {
    return { valid: false };
  }
  return { valid: true, ext: info.ext, category: info.category };
}

/**
 * Generate storage path for a file
 */
export function generateStoragePath(projectId: string, ext: string): string {
  const uuid = randomUUID();
  return `projects/${projectId}/${uuid}.${ext}`;
}

/**
 * Upload file to S3
 */
export async function uploadFile(
  storagePath: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: storagePath,
      Body: buffer,
      ContentType: mimeType,
    })
  );
}

/**
 * Download file from S3
 */
export async function downloadFile(storagePath: string): Promise<{ buffer: Buffer; contentType: string }> {
  const client = getS3Client();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: storagePath,
    })
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: response.ContentType || "application/octet-stream",
  };
}

/**
 * Delete file from S3
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: storagePath,
    })
  );
}

/**
 * Check if file exists in S3
 */
export async function fileExists(storagePath: string): Promise<boolean> {
  const client = getS3Client();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: storagePath,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a signed URL for direct download (valid for 1 hour)
 */
export async function getSignedDownloadUrl(storagePath: string, filename: string): Promise<string> {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: storagePath,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * Get file category from mime type
 */
export function getCategoryFromMimeType(mimeType: string): FileCategory {
  const info = ALLOWED_MIME_TYPES[mimeType as AllowedMimeType];
  return info?.category || "other";
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
