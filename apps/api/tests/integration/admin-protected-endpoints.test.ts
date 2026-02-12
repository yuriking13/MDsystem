import { beforeEach, describe, expect, it, vi } from "vitest";

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
  process.env.JWT_SECRET = "test-jwt-secret-for-admin-protected-tests";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

async function buildAdminApp(options: { isAdmin: boolean }) {
  setTestEnv();

  queryMock.mockImplementation(async (sql: string) => {
    const text = sql.replace(/\s+/g, " ").trim();

    if (text.startsWith("SELECT is_admin FROM users WHERE id = $1")) {
      return {
        rowCount: 1,
        rows: [{ is_admin: options.isAdmin }],
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");
  const { adminRoutes } = await import("../../src/routes/admin/full.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(adminRoutes);

  return app;
}

describe("Admin protected endpoints", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
  });

  it("returns 401 for unauthenticated /api/admin/me", async () => {
    const app = await buildAdminApp({ isAdmin: true });

    const res = await app.inject({
      method: "GET",
      url: "/api/admin/me",
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "Unauthorized" });

    await app.close();
  });

  it("returns 403 for authenticated non-admin /api/admin/me", async () => {
    const app = await buildAdminApp({ isAdmin: false });
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const token = app.jwt.sign({
      sub: userId,
      email: "user@example.com",
      type: "access",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/admin/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: "Admin access required" });

    await app.close();
  });

  it("returns current admin user for /api/admin/me", async () => {
    const app = await buildAdminApp({ isAdmin: true });
    const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const token = app.jwt.sign({
      sub: userId,
      email: "admin@example.com",
      type: "access",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/admin/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      user: {
        id: userId,
        email: "admin@example.com",
        isAdmin: true,
      },
    });

    await app.close();
  });
});
