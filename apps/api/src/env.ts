import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["production", "development", "test"]),
  HOST: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(20),
  API_KEY_ENCRYPTION_SECRET: z.string().min(32),

  CORS_ORIGIN: z.string().min(1),
  CROSSREF_MAILTO: z.string().email(),

  // S3-compatible storage (Yandex Object Storage)
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().optional().default("ru-central1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),

  // Redis caching (optional)
  REDIS_URL: z.string().optional(), // e.g. redis://localhost:6379
  REDIS_PASSWORD: z.string().optional(),
  REDIS_CACHE_TTL: z.coerce.number().int().min(1).optional().default(300), // Default 5 minutes
});

export type Env = z.infer<typeof EnvSchema>;

function envLen(key: string): number {
  const v = process.env[key];
  return typeof v === "string" ? v.length : 0;
}

function formatEnvIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((i) => {
      const key = String(i.path?.[0] ?? "UNKNOWN_ENV");
      if (i.code === "invalid_type") {
        return `- ${key}: missing (required)`;
      }
      if (i.code === "too_small" && i.minimum != null) {
        return `- ${key}: too short (len=${envLen(key)}, min=${i.minimum})`;
      }
      if (i.code === "invalid_string") {
        return `- ${key}: invalid format (${i.validation})`;
      }
      return `- ${key}: ${i.message}`;
    })
    .join("\n");
}

/**
 * IMPORTANT:
 * - Никаких dotenv/.env
 * - Только process.env (systemd drop-in на сервере)
 */
export const env: Env = (() => {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Без утечки значений: показываем только факт/формат/длину
    const details = formatEnvIssues(parsed.error.issues);
    // eslint-disable-next-line no-console
    console.error(
      [
        "❌ Invalid environment variables for thesis-api.",
        "Fix systemd drop-in override.conf (no BOM/CRLF, first line [Service]).",
        "Details:",
        details,
      ].join("\n"),
    );
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
})();
