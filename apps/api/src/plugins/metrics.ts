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
import { getPoolStats } from "../pg.js";
import { getAccessCacheStats } from "../utils/project-access.js";
import { requireAdminAccess } from "../utils/require-admin.js";

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
    } catch {
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
    } catch {
      // Cache might not be initialized yet
    }
  };

  // Initial update
  updatePoolStats();
  updateCacheStats();

  // Update every 15 seconds
  const intervalId = setInterval(() => {
    updatePoolStats();
    updateCacheStats();
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
