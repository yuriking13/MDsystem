import { z } from "zod";

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }
  return value;
}

function parseBooleanEnv(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return undefined;
  }
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return value;
}

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["production", "development", "test"]),
    HOST: z.string().min(1),
    PORT: z.coerce.number().int().min(1).max(65535),

    DATABASE_URL: z.string().min(1),

    JWT_SECRET: z.string().min(20),
    JWT_SECRET_PREVIOUS: z.preprocess(
      emptyStringToUndefined,
      z.string().min(20).optional(),
    ),
    JWT_SECRET_KID: z.string().min(1).optional().default("k-current"),
    JWT_SECRET_PREVIOUS_KID: z.string().min(1).optional().default("k-previous"),
    JWT_ROTATION_MODE: z.preprocess(
      emptyStringToUndefined,
      z.enum(["stable", "rotation"]).optional().default("stable"),
    ),
    JWT_ROTATION_STARTED_AT: z.preprocess(
      emptyStringToUndefined,
      z.string().datetime({ offset: true }).optional(),
    ),
    JWT_ROTATION_WINDOW_MINUTES: z.preprocess(
      emptyStringToUndefined,
      z.coerce
        .number()
        .int()
        .min(1)
        .max(60 * 24 * 7)
        .optional(),
    ),
    API_KEY_ENCRYPTION_SECRET: z.string().min(32),
    API_KEY_ENCRYPTION_SECRET_PREVIOUS: z.preprocess(
      emptyStringToUndefined,
      z.string().min(32).optional(),
    ),

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

    // Server configuration (optional with sensible defaults)
    MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).optional().default(500), // Max upload file size in MB
    DB_POOL_SIZE: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20), // PostgreSQL pool size
    DB_POOL_MIN: z.coerce.number().int().min(0).optional().default(2), // Min pool connections
    REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .optional()
      .default(30000), // Request timeout
    TRUST_PROXY: z.preprocess(
      emptyStringToUndefined,
      z.string().min(1).optional(),
    ), // Fastify trust proxy config (boolean/number/IP/CIDR/list as string)
    STATEMENT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .optional()
      .default(30000), // SQL statement timeout

    // JWT tokens configuration
    ACCESS_TOKEN_EXPIRES: z.string().optional().default("15m"), // Access token lifetime
    REFRESH_TOKEN_EXPIRES: z.string().optional().default("7d"), // Refresh token lifetime
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(1).optional().default(5),
    RATE_LIMIT_REGISTER_MAX: z.coerce
      .number()
      .int()
      .min(1)
      .optional()
      .default(3),
    METRICS_SCRAPE_TOKEN: z.preprocess(
      emptyStringToUndefined,
      z.string().min(20).optional(),
    ), // Optional bearer token for Prometheus scraping

    // Sentry (optional)
    SENTRY_DSN: z.preprocess(
      emptyStringToUndefined,
      z.string().url().optional(),
    ),
    SENTRY_ENVIRONMENT: z.preprocess(
      emptyStringToUndefined,
      z.string().min(1).optional(),
    ),
    SENTRY_RELEASE: z.preprocess(
      emptyStringToUndefined,
      z.string().min(1).optional(),
    ),
    SENTRY_TRACES_SAMPLE_RATE: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().min(0).max(1).optional().default(0),
    ),

    // OpenTelemetry OTLP exporter (optional)
    OTEL_ENABLED: z.preprocess(
      parseBooleanEnv,
      z.boolean().optional().default(true),
    ),
    OTEL_SERVICE_NAME: z.preprocess(
      emptyStringToUndefined,
      z.string().min(1).optional().default("thesis-api"),
    ),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(
      emptyStringToUndefined,
      z.string().url().optional(),
    ),
    OTEL_EXPORTER_OTLP_HEADERS: z.preprocess(
      emptyStringToUndefined,
      z.string().min(1).optional(),
    ),
    OTEL_TRACES_SAMPLE_RATIO: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().min(0).max(1).optional().default(1),
    ),

    // AI illustration pipeline feature flags
    AI_ILLUSTRATION_AGENTIC_ENABLED: z.preprocess(
      parseBooleanEnv,
      z.boolean().optional().default(false),
    ),
    AI_ILLUSTRATION_AGENTIC_MAX_CRITIC_ROUNDS: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().int().min(0).max(2).optional().default(1),
    ),

    // Logging
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
    CSP_REPORT_URI: z.preprocess(
      emptyStringToUndefined,
      z.string().url().optional(),
    ),
  })
  .superRefine((values, ctx) => {
    const hasPreviousSecret = Boolean(values.JWT_SECRET_PREVIOUS);
    const hasRotationMetadata =
      Boolean(values.JWT_ROTATION_STARTED_AT) ||
      values.JWT_ROTATION_WINDOW_MINUTES !== undefined;

    if (hasPreviousSecret && values.JWT_SECRET === values.JWT_SECRET_PREVIOUS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET_PREVIOUS"],
        message: "must differ from JWT_SECRET",
      });
    }

    if (
      hasPreviousSecret &&
      values.JWT_SECRET_KID === values.JWT_SECRET_PREVIOUS_KID
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET_PREVIOUS_KID"],
        message: "must differ from JWT_SECRET_KID",
      });
    }

    if (values.JWT_ROTATION_MODE === "stable") {
      if (hasPreviousSecret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET_PREVIOUS"],
          message:
            "set only when JWT_ROTATION_MODE=rotation (stable mode forbids previous key)",
        });
      }
      if (hasRotationMetadata) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_ROTATION_MODE"],
          message:
            "rotation metadata (JWT_ROTATION_STARTED_AT/JWT_ROTATION_WINDOW_MINUTES) is allowed only in rotation mode",
        });
      }
    }

    if (values.JWT_ROTATION_MODE === "rotation") {
      if (!hasPreviousSecret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET_PREVIOUS"],
          message:
            "required in rotation mode to validate tokens from the previous key",
        });
      }
      if (!values.JWT_ROTATION_STARTED_AT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_ROTATION_STARTED_AT"],
          message:
            "required in rotation mode (ISO-8601 timestamp with timezone)",
        });
      }
      if (values.JWT_ROTATION_WINDOW_MINUTES === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_ROTATION_WINDOW_MINUTES"],
          message: "required in rotation mode",
        });
      }

      if (
        values.JWT_ROTATION_STARTED_AT &&
        values.JWT_ROTATION_WINDOW_MINUTES !== undefined
      ) {
        const startedAtMs = Date.parse(values.JWT_ROTATION_STARTED_AT);
        if (!Number.isNaN(startedAtMs)) {
          const now = Date.now();
          const futureSkewMs = 5 * 60 * 1000;
          const windowMs = values.JWT_ROTATION_WINDOW_MINUTES * 60 * 1000;
          const expiresAtMs = startedAtMs + windowMs;

          if (startedAtMs > now + futureSkewMs) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["JWT_ROTATION_STARTED_AT"],
              message: "cannot be in the future (beyond 5 minute clock skew)",
            });
          }

          if (now > expiresAtMs) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["JWT_ROTATION_WINDOW_MINUTES"],
              message:
                "rotation window has elapsed; remove JWT_SECRET_PREVIOUS and switch JWT_ROTATION_MODE=stable",
            });
          }
        }
      }
    }
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
