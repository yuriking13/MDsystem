import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, verifyPasswordMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
}));

vi.mock("../../src/pg.js", () => ({
  pool: {
    query: queryMock,
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  },
}));

vi.mock("../../src/lib/password.js", () => ({
  hashPassword: vi.fn(async (password: string) => `hash:${password}`),
  verifyPassword: verifyPasswordMock,
}));

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.HOST = "127.0.0.1";
  process.env.PORT = "3001";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/mdsystem_test";
  process.env.JWT_SECRET = "test-jwt-secret-for-trust-proxy-tests";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
  process.env.TRUST_PROXY = "true";
}

describe("Trust proxy request IP handling", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
    verifyPasswordMock.mockReset();
  });

  it("uses forwarded IP for rate-limit key generation", async () => {
    setTestEnv();
    const { default: Fastify } = await import("fastify");
    const { createRateLimiter } = await import("../../src/plugins/rate-limit.js");

    const app = Fastify({ logger: false, trustProxy: true });
    const limiter = createRateLimiter("trust-proxy-rate", {
      max: 1,
      windowMs: 60_000,
      message: "rate limited",
    });

    app.get("/api/limited", { preHandler: [limiter] }, async () => ({ ok: true }));
    await app.ready();

    const first = await app.inject({
      method: "GET",
      url: "/api/limited",
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "GET",
      url: "/api/limited",
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });
    expect(second.statusCode).toBe(429);

    const otherIp = await app.inject({
      method: "GET",
      url: "/api/limited",
      headers: {
        "x-forwarded-for": "203.0.113.11",
      },
    });
    expect(otherIp.statusCode).toBe(200);

    await app.close();
  });

  it("writes forwarded req.ip to admin audit log", async () => {
    setTestEnv();
    verifyPasswordMock.mockResolvedValue(true);

    const auditIps: string[] = [];

    queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
      const text = sql.replace(/\s+/g, " ").trim();

      if (
        text.startsWith(
          "SELECT id, email, password_hash, is_admin, admin_token_hash, is_blocked FROM users WHERE email = $1",
        )
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              email: "admin@example.com",
              password_hash: "hash:any",
              is_admin: true,
              admin_token_hash: null,
              is_blocked: false,
            },
          ],
        };
      }

      if (text.startsWith("UPDATE users SET last_login_at = now() WHERE id = $1")) {
        return { rowCount: 1, rows: [] };
      }

      if (text.startsWith("INSERT INTO admin_audit_log")) {
        auditIps.push(String(params[5] ?? ""));
        return { rowCount: 1, rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const { default: Fastify } = await import("fastify");
    const { default: authPlugin } = await import("../../src/auth.js");
    const { adminRoutes } = await import("../../src/routes/admin/full.js");

    const app = Fastify({ logger: false, trustProxy: true });
    await app.register(authPlugin);
    await app.register(adminRoutes);

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/login",
      headers: {
        "x-forwarded-for": "198.51.100.55",
      },
      payload: {
        email: "admin@example.com",
        password: "valid-password",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(auditIps).toEqual(["198.51.100.55"]);

    await app.close();
  });
});
