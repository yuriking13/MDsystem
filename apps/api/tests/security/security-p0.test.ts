import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("../../src/pg.js", () => ({
  pool: {
    query: queryMock,
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  },
}));

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.HOST = "127.0.0.1";
  process.env.PORT = "3001";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/mdsystem_test";
  process.env.JWT_SECRET = "test-jwt-secret-for-security-tests";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

async function buildAppWithAuthRoute() {
  setTestEnv();
  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  app.get("/protected", { preHandler: [app.auth] }, async () => ({ ok: true }));
  return app;
}

async function buildAppWithAdminRoutes() {
  setTestEnv();
  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");
  const { adminRoutes } = await import("../../src/routes/admin/full.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await adminRoutes(app);
  return app;
}

async function buildAppWithHealthRoutes() {
  setTestEnv();
  const { default: Fastify } = await import("fastify");
  const { healthRoutes } = await import("../../src/routes/health.js");

  const app = Fastify({ logger: false });
  await healthRoutes(app);
  return app;
}

describe("Security P0", () => {
  beforeEach(() => {
    queryMock.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("revokes blocked user refresh tokens in refresh flow", async () => {
    const app = await buildAppWithAuthRoute();

    queryMock
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            user_id: "11111111-1111-4111-8111-111111111111",
            email: "blocked@example.com",
            is_blocked: true,
            expires_at: new Date(Date.now() + 60_000).toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await app.verifyRefreshToken("refresh-token");
    expect(result).toBeNull();
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE refresh_tokens SET revoked = true"),
      ["11111111-1111-4111-8111-111111111111"],
    );

    await app.close();
  });

  it("denies blocked user even with valid access token", async () => {
    const app = await buildAppWithAuthRoute();
    const token = app.jwt.sign({
      sub: "22222222-2222-4222-8222-222222222222",
      email: "user@example.com",
      type: "access",
    });

    queryMock
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ is_blocked: true }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      error: "AccountBlocked",
    });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "UPDATE refresh_tokens SET revoked = true WHERE user_id = $1",
      ),
      ["22222222-2222-4222-8222-222222222222"],
    );

    await app.close();
  });

  it("revokes refresh tokens on admin block and bulk-block", async () => {
    const app = await buildAppWithAdminRoutes();
    const adminToken = app.jwt.sign({
      sub: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      email: "admin@example.com",
      type: "access",
    });

    queryMock
      // PATCH /api/admin/users/:userId/block
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ is_admin: true }] }) // requireAdmin
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // update users
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // revokeAllUserTokens
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // audit log
      // POST /api/admin/users/bulk-block
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ is_admin: true }] }) // requireAdmin
      .mockResolvedValueOnce({ rowCount: 2, rows: [] }) // update users
      .mockResolvedValueOnce({ rowCount: 2, rows: [] }) // revoke refresh tokens for all
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // audit log

    const singleUserId = "33333333-3333-4333-8333-333333333333";
    const single = await app.inject({
      method: "PATCH",
      url: `/api/admin/users/${singleUserId}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { blocked: true, reason: "policy" },
    });
    expect(single.statusCode).toBe(200);

    const userIds = [
      "44444444-4444-4444-8444-444444444444",
      "55555555-5555-4555-8555-555555555555",
    ];
    const bulk = await app.inject({
      method: "POST",
      url: "/api/admin/users/bulk-block",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { userIds, blocked: true, reason: "bulk-policy" },
    });
    expect(bulk.statusCode).toBe(200);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "UPDATE refresh_tokens SET revoked = true WHERE user_id = $1",
      ),
      [singleUserId],
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = ANY($1::uuid[])"),
      [userIds],
    );

    await app.close();
  });

  it("keeps public health response sanitized", async () => {
    const app = await buildAppWithHealthRoutes();
    queryMock.mockResolvedValue({
      rowCount: 1,
      rows: [{ health: 1, time: new Date().toISOString() }],
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(res.statusCode).toBe(200);
    const payload = res.json();
    expect(payload).toHaveProperty("status");
    expect(payload).toHaveProperty("checks.database.status");
    expect(payload).not.toHaveProperty("checks.database.message");
    expect(payload).not.toHaveProperty("checks.database.details");
    expect(payload).not.toHaveProperty("components");
    expect(payload).not.toHaveProperty("stats");

    await app.close();
  });
});
