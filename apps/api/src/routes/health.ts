/**
 * Health Check Routes
 * Provides endpoints for monitoring system health and dependencies
 */

import { FastifyInstance } from "fastify";
import { pool } from "../pg.js";
import {
  getRedisClient,
  isRedisConfigured,
  getCacheBackend,
} from "../lib/redis.js";
import { isStorageConfigured, getS3Client } from "../lib/storage.js";
import { getHttpClientStats, resetCircuitBreaker } from "../lib/http-client.js";
import { getConnectionStats } from "../websocket.js";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { env } from "../env.js";
import { requireAdminAccess } from "../utils/require-admin.js";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: PublicComponentHealth;
    cache: PublicComponentHealth;
    storage: PublicComponentHealth;
  };
}

interface ComponentHealth {
  status: "healthy" | "unhealthy" | "not_configured";
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

type PublicComponentHealth = Pick<ComponentHealth, "status" | "latencyMs">;

const startTime = Date.now();

function toPublicComponentHealth(
  component: ComponentHealth,
): PublicComponentHealth {
  return {
    status: component.status,
    latencyMs: component.latencyMs,
  };
}

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now();
  try {
    const result = await pool.query("SELECT 1 as health, NOW() as time");
    const latencyMs = Date.now() - start;

    if (result.rows[0]?.health === 1) {
      return { status: "healthy", latencyMs };
    }
    return {
      status: "unhealthy",
      latencyMs,
      message: "Unexpected query result",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      message: (error as Error).message,
    };
  }
}

async function checkCache(): Promise<ComponentHealth> {
  if (!isRedisConfigured()) {
    const backend = getCacheBackend();
    return {
      status: "healthy",
      message: "Using in-memory cache (Redis not configured)",
      details: backend.stats,
    };
  }

  const start = Date.now();
  try {
    const client = await getRedisClient();
    if (!client) {
      const backend = getCacheBackend();
      return {
        status: "healthy",
        latencyMs: Date.now() - start,
        message: "Fallback to in-memory cache",
        details: backend.stats,
      };
    }

    await client.ping();
    const latencyMs = Date.now() - start;

    return { status: "healthy", latencyMs };
  } catch (error) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      message: (error as Error).message,
    };
  }
}

async function checkStorage(): Promise<ComponentHealth> {
  if (!isStorageConfigured()) {
    return { status: "not_configured", message: "S3 storage not configured" };
  }

  const start = Date.now();
  try {
    const client = getS3Client();
    await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET_NAME }));
    const latencyMs = Date.now() - start;

    return { status: "healthy", latencyMs };
  } catch (error) {
    return {
      status: "unhealthy",
      latencyMs: Date.now() - start,
      message: (error as Error).message,
    };
  }
}

export function healthRoutes(app: FastifyInstance) {
  /**
   * Basic liveness probe - just returns 200 if server is running
   * Use for Kubernetes liveness probe
   */
  app.get("/api/health/live", async () => {
    return { status: "ok" };
  });

  /**
   * Readiness probe - checks if the server can handle requests
   * Use for Kubernetes readiness probe
   */
  app.get("/api/health/ready", async (_, reply) => {
    const db = await checkDatabase();

    if (db.status === "unhealthy") {
      return reply.status(503).send({
        status: "not_ready",
        reason: "Database unavailable",
      });
    }

    return {
      status: "ready",
      checks: {
        database: toPublicComponentHealth(db),
      },
    };
  });

  /**
   * Full health check with all dependencies
   * Returns detailed status of all components
   * Also serves as basic health check for load balancer at /api/health
   */
  app.get("/api/health", async (_, reply) => {
    const [database, cache, storage] = await Promise.all([
      checkDatabase(),
      checkCache(),
      checkStorage(),
    ]);

    const checks = {
      database: toPublicComponentHealth(database),
      cache: toPublicComponentHealth(cache),
      storage: toPublicComponentHealth(storage),
    };

    // Determine overall status
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (database.status === "unhealthy") {
      overallStatus = "unhealthy";
    } else if (cache.status === "unhealthy" || storage.status === "unhealthy") {
      overallStatus = "degraded";
    }

    const health: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: process.env.npm_package_version || "1.0.0",
      checks,
    };

    const statusCode =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : 503;
    return reply.status(statusCode).send(health);
  });

  /**
   * Detailed health check (admin only)
   */
  app.get(
    "/api/health/detailed",
    { preHandler: [requireAdminAccess] },
    async () => {
      const [database, cache, storage] = await Promise.all([
        checkDatabase(),
        checkCache(),
        checkStorage(),
      ]);

      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        environment: env.NODE_ENV,
        components: {
          database,
          cache,
          storage,
        },
        stats: {
          websocket: getConnectionStats(),
          httpClient: getHttpClientStats(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
        config: {
          redisConfigured: isRedisConfigured(),
          storageConfigured: isStorageConfigured(),
          corsOrigin: env.CORS_ORIGIN,
        },
      };
    },
  );

  /**
   * Reset circuit breaker for an API (for admin/debugging)
   */
  app.post(
    "/api/health/circuit-breaker/:apiName/reset",
    { preHandler: [requireAdminAccess] },
    async (req, reply) => {
      if (env.NODE_ENV === "production") {
        return reply.code(403).send({
          error: "Forbidden",
          message: "Circuit breaker reset is disabled in production",
        });
      }
      const { apiName } = req.params as { apiName: string };
      resetCircuitBreaker(apiName);
      return { status: "ok", message: `Circuit breaker for ${apiName} reset` };
    },
  );
}
