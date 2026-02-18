/**
 * Prometheus Metrics Plugin для Fastify
 *
 * Предоставляет метрики для мониторинга:
 * - HTTP запросы (latency, count, errors)
 * - Node.js метрики (memory, CPU, event loop)
 * - Пользовательские бизнес-метрики
 */

import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import client from "prom-client";
import crypto from "node:crypto";
import { env } from "../env.js";
import { getPoolStats, pool } from "../pg.js";
import { getAccessCacheStats } from "../utils/project-access.js";
import { requireAdminAccess } from "../utils/require-admin.js";
import { getRedisClient, isRedisConfigured } from "../lib/redis.js";

// Создаём реестр метрик
const register = new client.Registry();

// Добавляем дефолтные метрики Node.js
client.collectDefaultMetrics({ register });

// HTTP Request Duration Histogram
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// HTTP Requests Total Counter
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

// Active Connections Gauge
const activeConnections = new client.Gauge({
  name: "http_active_connections",
  help: "Number of active HTTP connections",
  registers: [register],
});

// Database Pool Metrics
const dbPoolTotal = new client.Gauge({
  name: "db_pool_connections_total",
  help: "Total connections in database pool",
  registers: [register],
});

const dbPoolIdle = new client.Gauge({
  name: "db_pool_connections_idle",
  help: "Idle connections in database pool",
  registers: [register],
});

const dbPoolWaiting = new client.Gauge({
  name: "db_pool_connections_waiting",
  help: "Waiting requests for database connection",
  registers: [register],
});

// Cache Metrics
const cacheHitRate = new client.Gauge({
  name: "cache_hit_rate_percent",
  help: "Cache hit rate percentage",
  labelNames: ["cache_name"],
  registers: [register],
});

const cacheSize = new client.Gauge({
  name: "cache_size",
  help: "Number of items in cache",
  labelNames: ["cache_name"],
  registers: [register],
});

// Operational Health Metrics
const serviceHealthStatus = new client.Gauge({
  name: "service_health_status",
  help: "Service health status by component (1=healthy, 0=unhealthy)",
  labelNames: ["component"],
  registers: [register],
});

const workerQueueJobs = new client.Gauge({
  name: "worker_queue_jobs",
  help: "Worker jobs by queue and status in the last 24h",
  labelNames: ["queue", "status"],
  registers: [register],
});

const metricsCollectorErrorsTotal = new client.Counter({
  name: "metrics_collector_errors_total",
  help: "Total number of metrics collector refresh errors",
  labelNames: ["collector"],
  registers: [register],
});

// Business Metrics
const articlesSearched = new client.Counter({
  name: "articles_searched_total",
  help: "Total number of article searches",
  labelNames: ["source"],
  registers: [register],
});

const projectsCreated = new client.Counter({
  name: "projects_created_total",
  help: "Total number of projects created",
  registers: [register],
});

// Export metrics for use in routes
export const metrics = {
  articlesSearched,
  projectsCreated,
};

function pickHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
}

function extractMetricsToken(request: FastifyRequest): string | undefined {
  const authorization = pickHeaderValue(request.headers.authorization);
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  const explicitToken = pickHeaderValue(request.headers["x-metrics-token"]);
  return explicitToken?.trim();
}

function hasValidMetricsToken(request: FastifyRequest): boolean {
  const expectedToken = env.METRICS_SCRAPE_TOKEN?.trim();
  if (!expectedToken) {
    return false;
  }

  const providedToken = extractMetricsToken(request);
  if (!providedToken) {
    return false;
  }

  const expected = Buffer.from(expectedToken, "utf8");
  const provided = Buffer.from(providedToken, "utf8");
  if (expected.length !== provided.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, provided);
}

// Plugin
const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  type WorkerStatusRow = { status: string; total: string };
  const workerFailureStatuses = new Set(["failed", "timeout"]);
  const healthComponents = ["database", "cache", "workers", "overall"] as const;

  const setHealthStatus = (component: string, healthy: boolean) => {
    serviceHealthStatus.set({ component }, healthy ? 1 : 0);
  };

  const markCollectorError = (collector: string, error: unknown) => {
    metricsCollectorErrorsTotal.inc({ collector });
    fastify.log.warn(
      {
        collector,
        err: error instanceof Error ? error : new Error(String(error)),
      },
      "Metrics collector refresh error",
    );
  };

  // Track active connections
  let connectionCount = 0;

  fastify.addHook("onRequest", async () => {
    connectionCount++;
    activeConnections.set(connectionCount);
  });

  fastify.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      connectionCount--;
      activeConnections.set(connectionCount);

      // Record request metrics
      const route = request.routeOptions?.url || request.url;
      const method = request.method;
      const statusCode = reply.statusCode.toString();
      const duration = reply.elapsedTime / 1000; // Convert to seconds

      httpRequestDuration.observe(
        { method, route, status_code: statusCode },
        duration,
      );

      httpRequestsTotal.inc({ method, route, status_code: statusCode });
    },
  );

  // Update pool stats periodically
  const updatePoolStats = () => {
    try {
      const stats = getPoolStats();
      dbPoolTotal.set(stats.total);
      dbPoolIdle.set(stats.idle);
      dbPoolWaiting.set(stats.waiting);
    } catch (error) {
      markCollectorError("db_pool", error);
      // Pool might not be initialized yet
    }
  };

  // Update cache stats periodically
  const updateCacheStats = () => {
    try {
      const accessStats = getAccessCacheStats();
      cacheSize.set({ cache_name: "project_access" }, accessStats.size);

      const hitRate = parseFloat(accessStats.hitRate.replace("%", ""));
      if (!isNaN(hitRate)) {
        cacheHitRate.set({ cache_name: "project_access" }, hitRate);
      }
    } catch (error) {
      markCollectorError("project_access_cache", error);
      // Cache might not be initialized yet
    }
  };

  const checkDatabaseHealth = async (): Promise<boolean> => {
    try {
      await pool.query("SELECT 1");
      return true;
    } catch (error) {
      markCollectorError("health_database", error);
      return false;
    }
  };

  const checkCacheHealth = async (): Promise<boolean> => {
    if (!isRedisConfigured()) {
      return true;
    }

    try {
      const redisClient = await getRedisClient();
      if (!redisClient) {
        // Redis fallback to in-memory cache is considered healthy.
        return true;
      }
      await redisClient.ping();
      return true;
    } catch (error) {
      markCollectorError("health_cache", error);
      return false;
    }
  };

  const updateWorkerStats = async (): Promise<boolean> => {
    workerQueueJobs.reset();
    let hasFailures = false;

    try {
      const [graphJobsResult, embeddingJobsResult] = await Promise.all([
        pool.query(
          `SELECT status, COUNT(*)::int AS total
           FROM graph_fetch_jobs
           WHERE created_at >= NOW() - INTERVAL '24 hours'
           GROUP BY status`,
        ),
        pool.query(
          `SELECT status, COUNT(*)::int AS total
           FROM embedding_jobs
           WHERE created_at >= NOW() - INTERVAL '24 hours'
           GROUP BY status`,
        ),
      ]);

      const applyRows = (queue: string, rows: WorkerStatusRow[]) => {
        for (const row of rows) {
          const total = Number(row.total);
          if (Number.isNaN(total)) {
            continue;
          }
          workerQueueJobs.set({ queue, status: row.status }, total);
          if (workerFailureStatuses.has(row.status) && total > 0) {
            hasFailures = true;
          }
        }
      };

      applyRows("graph_fetch", graphJobsResult.rows as WorkerStatusRow[]);
      applyRows("embeddings", embeddingJobsResult.rows as WorkerStatusRow[]);
      return !hasFailures;
    } catch (error) {
      markCollectorError("worker_jobs", error);
      return false;
    }
  };

  let refreshInFlight = false;
  const refreshOperationalMetrics = async () => {
    if (refreshInFlight) {
      return;
    }

    refreshInFlight = true;
    try {
      updatePoolStats();
      updateCacheStats();

      const [dbHealthy, cacheHealthy, workersHealthy] = await Promise.all([
        checkDatabaseHealth(),
        checkCacheHealth(),
        updateWorkerStats(),
      ]);

      setHealthStatus("database", dbHealthy);
      setHealthStatus("cache", cacheHealthy);
      setHealthStatus("workers", workersHealthy);
      setHealthStatus("overall", dbHealthy && cacheHealthy && workersHealthy);
    } finally {
      refreshInFlight = false;
    }
  };

  for (const component of healthComponents) {
    serviceHealthStatus.set({ component }, 0);
  }

  await refreshOperationalMetrics();

  // Update every 15 seconds
  const intervalId = setInterval(() => {
    void refreshOperationalMetrics();
  }, 15000);

  // Cleanup on close
  fastify.addHook("onClose", async () => {
    clearInterval(intervalId);
  });

  // Metrics endpoint
  fastify.get(
    "/metrics",
    {
      preHandler: async (request, reply) => {
        if (hasValidMetricsToken(request)) {
          return;
        }
        return requireAdminAccess(request, reply);
      },
    },
    async (_request, reply) => {
      reply.header("Content-Type", register.contentType);
      return register.metrics();
    },
  );
};

export default fp(metricsPlugin, {
  name: "metrics",
  fastify: "5.x",
});
