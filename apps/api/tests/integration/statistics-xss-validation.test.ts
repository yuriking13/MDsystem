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

vi.mock("../../src/websocket.js", () => ({
  wsEvents: {
    statisticCreated: vi.fn(),
    statisticUpdated: vi.fn(),
    statisticDeleted: vi.fn(),
  },
}));

vi.mock("../../src/lib/redis.js", () => ({
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => true),
  invalidateStatistics: vi.fn(async () => undefined),
  invalidateStatistic: vi.fn(async () => undefined),
  CACHE_KEYS: {
    statistics: (projectId: string) => `stats:${projectId}`,
  },
  TTL: {
    SHORT: 60,
  },
}));

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.HOST = "127.0.0.1";
  process.env.PORT = "3001";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/mdsystem_test";
  process.env.JWT_SECRET = "test-jwt-secret-for-statistics-validation";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

async function buildStatisticsApp(projectId: string, userId: string) {
  setTestEnv();
  queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const text = sql.replace(/\s+/g, " ").trim();

    if (text.startsWith("SELECT is_blocked FROM users WHERE id = $1")) {
      return { rowCount: 1, rows: [{ is_blocked: false }] };
    }

    if (
      text.startsWith(
        "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
      )
    ) {
      if (params[0] === projectId && params[1] === userId) {
        return { rowCount: 1, rows: [{ role: "owner" }] };
      }
      return { rowCount: 0, rows: [] };
    }

    if (text.startsWith("INSERT INTO project_statistics")) {
      return {
        rowCount: 1,
        rows: [
          {
            id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            type: params[1],
            title: params[2],
            description: params[3],
            config: params[4],
            table_data: params[5],
            data_classification: params[6],
            chart_type: params[7],
            order_index: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");
  const { default: statisticsRoutes } =
    await import("../../src/routes/statistics.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(statisticsRoutes, { prefix: "/api" });
  return app;
}

describe("Statistics validation / XSS guard", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
  });

  it("rejects statistic creation with script payloads", async () => {
    const projectId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const userId = "99999999-9999-4999-8999-999999999999";
    const app = await buildStatisticsApp(projectId, userId);
    const token = app.jwt.sign({
      sub: userId,
      email: "owner@example.com",
      type: "access",
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/statistics`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: "table",
        title: "<script>alert('xss')</script>",
        config: {},
        tableData: {
          headers: ["Metric"],
          rows: [["10"]],
        },
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain("unsafe");

    await app.close();
  });

  it("creates statistic when payload is safe", async () => {
    const projectId = "12121212-1212-4121-8121-121212121212";
    const userId = "34343434-3434-4343-8343-343434343434";
    const app = await buildStatisticsApp(projectId, userId);
    const token = app.jwt.sign({
      sub: userId,
      email: "owner@example.com",
      type: "access",
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/statistics`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: "table",
        title: "Primary outcomes summary",
        description: "Summary table for cohort analysis",
        config: {},
        tableData: {
          headers: ["Outcome", "Value"],
          rows: [["HbA1c reduction", "1.2"]],
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      statistic: {
        title: "Primary outcomes summary",
      },
    });

    await app.close();
  });
});
