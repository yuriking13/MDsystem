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
  process.env.JWT_SECRET = "test-jwt-secret-for-admin-projects-safety";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

async function buildAdminApp(
  queryImpl: (sql: string, params?: unknown[]) => Promise<unknown>,
) {
  setTestEnv();
  queryMock.mockImplementation(queryImpl);

  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");
  const { adminRoutes } = await import("../../src/routes/admin/full.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(adminRoutes);
  return app;
}

describe("Admin projects query safety", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
  });

  it("rejects unsafe sortBy values", async () => {
    let projectsQueryExecuted = false;

    const app = await buildAdminApp(async (sql: string) => {
      const text = sql.replace(/\s+/g, " ").trim();
      if (text.startsWith("SELECT is_admin FROM users WHERE id = $1")) {
        return { rowCount: 1, rows: [{ is_admin: true }] };
      }

      if (text.startsWith("SELECT p.id, p.name, p.description")) {
        projectsQueryExecuted = true;
        return { rowCount: 0, rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const token = app.jwt.sign({
      sub: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      email: "admin@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/projects?sortBy=name;DROP TABLE users;--&sortOrder=desc",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "Invalid sortBy value" });
    expect(projectsQueryExecuted).toBe(false);

    await app.close();
  });

  it("rejects unsafe search filter values", async () => {
    let projectsQueryExecuted = false;

    const app = await buildAdminApp(async (sql: string) => {
      const text = sql.replace(/\s+/g, " ").trim();
      if (text.startsWith("SELECT is_admin FROM users WHERE id = $1")) {
        return { rowCount: 1, rows: [{ is_admin: true }] };
      }

      if (text.startsWith("SELECT p.id, p.name, p.description")) {
        projectsQueryExecuted = true;
        return { rowCount: 0, rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const token = app.jwt.sign({
      sub: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      email: "admin@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/projects?search=project;--",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Unsafe search filter value",
    });
    expect(projectsQueryExecuted).toBe(false);

    await app.close();
  });

  it("applies whitelisted dynamic sort expression for valid input", async () => {
    let listQueryText = "";
    let listQueryParams: unknown[] = [];

    const app = await buildAdminApp(
      async (sql: string, params: unknown[] = []) => {
        const text = sql.replace(/\s+/g, " ").trim();
        if (text.startsWith("SELECT is_admin FROM users WHERE id = $1")) {
          return { rowCount: 1, rows: [{ is_admin: true }] };
        }

        if (text.startsWith("SELECT p.id, p.name, p.description")) {
          listQueryText = text;
          listQueryParams = params;
          return { rowCount: 0, rows: [] };
        }

        if (
          text.startsWith(
            "SELECT COUNT(*) FROM projects p LEFT JOIN users u ON u.id = p.created_by",
          )
        ) {
          return { rowCount: 1, rows: [{ count: "0" }] };
        }

        throw new Error(`Unexpected query: ${text}`);
      },
    );

    const token = app.jwt.sign({
      sub: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      email: "admin@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/projects?search=demo&sortBy=documents_count&sortOrder=asc",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(listQueryText).toContain("ORDER BY COUNT(DISTINCT d.id) ASC");
    expect(listQueryParams).toEqual(["%demo%"]);

    await app.close();
  });
});
