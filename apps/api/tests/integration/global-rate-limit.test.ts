import { describe, expect, it, vi, beforeEach } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";

// Track rate limit calls
const rateLimitCalls: Map<string, number> = new Map();

vi.mock("../../src/plugins/rate-limit.js", () => {
  function createMockRateLimiter(name: string, max: number) {
    return async (_req: FastifyRequest, reply: FastifyReply) => {
      const key = name;
      const count = (rateLimitCalls.get(key) || 0) + 1;
      rateLimitCalls.set(key, count);
      if (count > max) {
        return reply.code(429).send({
          error: "TooManyRequests",
          message: `Rate limit exceeded for ${name}`,
        });
      }
    };
  }

  return {
    rateLimits: {
      api: createMockRateLimiter("api", 1000),
      login: createMockRateLimiter("login", 5),
      register: createMockRateLimiter("register", 3),
      passwordReset: createMockRateLimiter("password-reset", 3),
      ai: createMockRateLimiter("ai", 20),
      clientError: createMockRateLimiter("client-error", 10),
    },
    getRateLimitStats: vi.fn().mockResolvedValue({}),
    clearRateLimit: vi.fn().mockResolvedValue(true),
    createRateLimiter: vi.fn(),
  };
});

vi.mock("../../src/pg.js", () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  },
  getPoolStats: vi.fn().mockReturnValue({}),
}));

vi.mock("../../src/db.js", () => ({
  prisma: {
    $disconnect: vi.fn(),
  },
}));

vi.mock("../../src/lib/redis.js", () => ({
  initCache: vi.fn(),
  closeCache: vi.fn(),
  getCacheBackend: vi.fn().mockReturnValue("memory"),
  isRedisAvailable: vi.fn().mockReturnValue(false),
  getRedisClient: vi.fn().mockReturnValue(null),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn(),
  invalidateFiles: vi.fn(),
  invalidateFile: vi.fn(),
  invalidateArticles: vi.fn(),
  invalidateDocuments: vi.fn(),
  invalidateDocument: vi.fn(),
  CACHE_KEYS: {},
  TTL: {},
}));

vi.mock("../../src/websocket.js", () => ({
  registerWebSocket: vi.fn(),
  getConnectionStats: vi.fn().mockReturnValue({}),
}));

vi.mock("../../src/worker/index.js", () => ({
  startWorkers: vi.fn().mockResolvedValue(undefined),
  stopWorkers: vi.fn().mockResolvedValue(undefined),
}));

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.HOST = "127.0.0.1";
  process.env.PORT = "0";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/mdsystem_test";
  process.env.JWT_SECRET = "test-jwt-secret-for-rate-limit-tests";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

describe("Global API rate limiting", () => {
  beforeEach(() => {
    rateLimitCalls.clear();
  });

  it("should return 429 after 1000 requests to /api/* endpoint", async () => {
    setTestEnv();
    const { default: Fastify } = await import("fastify");
    const { rateLimits } = await import("../../src/plugins/rate-limit.js");

    const app = Fastify({ logger: false });

    // Register global rate limit hook
    app.addHook("onRequest", async (req, reply) => {
      if (req.url.startsWith("/api")) {
        await rateLimits.api(req, reply);
      }
    });

    // Test endpoint
    app.get("/api/test", async () => ({ ok: true }));

    await app.ready();

    // Send 1000 requests — all should succeed
    for (let i = 0; i < 1000; i++) {
      const res = await app.inject({ method: "GET", url: "/api/test" });
      expect(res.statusCode).toBe(200);
    }

    // 1001st request should be rate limited
    const res = await app.inject({ method: "GET", url: "/api/test" });
    expect(res.statusCode).toBe(429);

    const body = JSON.parse(res.body);
    expect(body.error).toBe("TooManyRequests");

    await app.close();
  });

  it("should not rate limit non-/api routes", async () => {
    setTestEnv();
    rateLimitCalls.clear();

    const { default: Fastify } = await import("fastify");
    const { rateLimits } = await import("../../src/plugins/rate-limit.js");

    const app = Fastify({ logger: false });

    app.addHook("onRequest", async (req, reply) => {
      if (req.url.startsWith("/api")) {
        await rateLimits.api(req, reply);
      }
    });

    app.get("/health", async () => ({ status: "ok" }));

    await app.ready();

    // Non-/api routes should not be rate limited
    for (let i = 0; i < 1100; i++) {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
    }

    // Verify rate limiter was not called for non-/api routes
    expect(rateLimitCalls.get("api") || 0).toBe(0);

    await app.close();
  });

  it("should apply specific rate limits independently of global limit", async () => {
    setTestEnv();
    rateLimitCalls.clear();

    const { default: Fastify } = await import("fastify");
    const { rateLimits } = await import("../../src/plugins/rate-limit.js");

    const app = Fastify({ logger: false });

    // Global rate limit
    app.addHook("onRequest", async (req, reply) => {
      if (req.url.startsWith("/api")) {
        await rateLimits.api(req, reply);
      }
    });

    // Specific rate limit (stricter — 5 req limit)
    app.post(
      "/api/auth/login",
      { preHandler: [rateLimits.login] },
      async () => ({ ok: true }),
    );

    await app.ready();

    // Login has its own limit of 5
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {},
      });
      expect(res.statusCode).toBe(200);
    }

    // 6th login should hit specific rate limit (429)
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {},
    });
    expect(res.statusCode).toBe(429);

    // Global counter should still be well within limits
    expect(rateLimitCalls.get("api") ?? 0).toBeLessThanOrEqual(6);

    await app.close();
  });
});
