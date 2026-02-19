import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import multipart from "@fastify/multipart";
import helmet from "@fastify/helmet";
import compress from "@fastify/compress";

import { env } from "./env.js";
import {
  captureBackendException,
  isOtelEnabled,
  isSentryEnabled,
  shutdownObservability,
} from "./observability/index.js";
import authPlugin from "./auth.js";
import { setupErrorHandler, setupNotFoundHandler } from "./utils/errors.js";

import { authRoutes } from "./routes/auth.js";
import { passwordResetRoutes } from "./routes/password-reset.js";
import settingsRoutes from "./routes/settings.js";
import projectsRoutes from "./routes/projects.js";
import articlesRoutes from "./routes/articles.js";
import documentsRoutes from "./routes/documents.js";
import statisticsRoutes from "./routes/statistics.js";
import filesRoutes from "./routes/files.js";
import aiWritingAssistantRoutes from "./routes/ai-writing-assistant.js";
import { semanticSearchRoutes } from "./routes/semantic-search.js";
import { methodologyClustersRoutes } from "./routes/methodology-clusters.js";
import { semanticClustersRoutes } from "./routes/semantic-clusters.js";
import { adminRoutes } from "./routes/admin.js";
import { healthRoutes } from "./routes/health.js";

import envGuard from "./plugins/00-env-guard.js";
import swaggerPlugin from "./plugins/swagger.js";
import metricsPlugin from "./plugins/metrics.js";
import { startWorkers, stopWorkers } from "./worker/index.js";
import { registerWebSocket, getConnectionStats } from "./websocket.js";
import { initCache, getCacheBackend, closeCache } from "./lib/redis.js";
import { getRateLimitStats, rateLimits } from "./plugins/rate-limit.js";
import { requireAdminAccess } from "./utils/require-admin.js";
import { parseTrustProxy } from "./utils/trust-proxy.js";

const trustProxy = parseTrustProxy(env.TRUST_PROXY);

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL || (env.NODE_ENV === "production" ? "info" : "debug"),
    // Добавляем request ID в логи
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket?.remotePort,
        };
      },
    },
  },
  // Генерация request ID для трассировки
  genReqId: () =>
    `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
  // Request timeout из env
  requestTimeout: env.REQUEST_TIMEOUT_MS,
  trustProxy,
});

app.log.info(
  {
    sentryEnabled: isSentryEnabled(),
    otelEnabled: isOtelEnabled(),
  },
  "Observability initialized",
);

// Централизованная обработка ошибок
setupErrorHandler(app);
setupNotFoundHandler(app);

await app.register(envGuard);

// Auth/JWT должен быть зарегистрирован до служебных плагинов с preHandler
await app.register(authPlugin);

// OpenAPI/Swagger documentation
await app.register(swaggerPlugin);

// Prometheus metrics
await app.register(metricsPlugin);

// HTTP Compression (gzip, brotli)
await app.register(compress, {
  global: true,
  encodings: ["gzip", "deflate"],
  threshold: 1024, // Сжимать ответы больше 1KB
});

const productionCspDirectives: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'", env.CORS_ORIGIN],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};

if (env.CSP_REPORT_URI) {
  productionCspDirectives.reportUri = [env.CSP_REPORT_URI];
}

// Security headers (Helmet)
await app.register(helmet, {
  // Настроенный CSP для production
  contentSecurityPolicy:
    env.NODE_ENV === "production"
      ? {
          directives: productionCspDirectives,
        }
      : false, // Отключаем CSP в dev для удобства
  crossOriginEmbedderPolicy: false, // Для совместимости с S3 файлами
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});
await app.register(sensible);
await app.register(multipart, {
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // MB to bytes
  },
});

// WebSocket для real-time синхронизации
await registerWebSocket(app);

// Global API rate limiting (1000 req/min per IP)
// More specific limits (login, register, AI) are applied per-route and take precedence
app.addHook("onRequest", async (req, reply) => {
  // Apply global rate limit to all /api/* routes
  if (req.url.startsWith("/api")) {
    await rateLimits.api(req, reply);
  }
});

await authRoutes(app);
await passwordResetRoutes(app);
await adminRoutes(app);
await app.register(settingsRoutes, { prefix: "/api" });
await app.register(projectsRoutes, { prefix: "/api" });
await app.register(articlesRoutes, { prefix: "/api" });
await app.register(documentsRoutes, { prefix: "/api" });
await app.register(statisticsRoutes, { prefix: "/api" });
await app.register(filesRoutes, { prefix: "/api" });
await app.register(aiWritingAssistantRoutes, { prefix: "/api" });
await app.register(semanticSearchRoutes, { prefix: "/api" });
await app.register(methodologyClustersRoutes, { prefix: "/api" });
await app.register(semanticClustersRoutes, { prefix: "/api" });

// Health check endpoints (улучшенная версия с circuit breaker stats)
await healthRoutes(app);

// Статистика WebSocket подключений
app.get("/api/ws-stats", { preHandler: [requireAdminAccess] }, async () =>
  getConnectionStats(),
);

// Статистика кэша
app.get("/api/cache-stats", { preHandler: [requireAdminAccess] }, async () =>
  getCacheBackend(),
);

// Статистика производительности (pool, кэши)
app.get("/api/perf-stats", { preHandler: [requireAdminAccess] }, async () => {
  const { getPoolStats } = await import("./pg.js");
  const { getAccessCacheStats } = await import("./utils/project-access.js");
  const { getHttpClientStats } = await import("./lib/http-client.js");

  return {
    pool: getPoolStats(),
    accessCache: getAccessCacheStats(),
    cache: getCacheBackend(),
    rateLimit: await getRateLimitStats(),
    httpClient: getHttpClientStats(),
    memory: {
      heapUsed:
        Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      heapTotal:
        Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + " MB",
    },
    uptime: Math.round(process.uptime()) + " sec",
  };
});

// Initialize cache on startup
await initCache();

// Graceful shutdown
const shutdown = async (signal: string) => {
  app.log.info({ signal }, "Received shutdown signal, gracefully stopping...");

  // 1. Останавливаем воркеры (завершают текущие задачи)
  try {
    await stopWorkers();
    app.log.info("Workers stopped");
  } catch (err) {
    captureBackendException(err, {
      component: "workers",
      mechanism: "shutdown",
    });
    app.log.error({ err }, "Error stopping workers");
  }

  // 2. Закрываем кэш
  try {
    await closeCache();
    app.log.info("Cache closed");
  } catch (err) {
    captureBackendException(err, {
      component: "cache",
      mechanism: "shutdown",
    });
    app.log.error({ err }, "Error closing cache");
  }

  // 3. Закрываем сервер (завершает активные соединения)
  try {
    await app.close();
    app.log.info("Server closed");
  } catch (err) {
    captureBackendException(err, {
      component: "http-server",
      mechanism: "shutdown",
    });
    app.log.error({ err }, "Error closing server");
  }

  await shutdownObservability();

  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

app
  .listen({ host: env.HOST, port: env.PORT })
  .then(() => {
    app.log.info(`API listening on http://${env.HOST}:${env.PORT}`);

    // Стартуем фоновые воркеры (pg-boss) для очередей
    startWorkers().catch((err) => {
      captureBackendException(err, {
        component: "workers",
        mechanism: "startup",
      });
      app.log.error({ err }, "Failed to start workers");
    });
  })
  .catch(async (err) => {
    captureBackendException(err, {
      component: "http-server",
      mechanism: "startup",
    });
    app.log.error(err);
    await shutdownObservability();
    process.exit(1);
  });
