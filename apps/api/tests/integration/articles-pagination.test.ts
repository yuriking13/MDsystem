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
  process.env.JWT_SECRET = "test-jwt-secret-for-articles-pagination-tests";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

async function buildArticlesApp(projectId: string, userId: string) {
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

    if (
      text.startsWith(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'project_articles' AND column_name = 'source_query'",
      )
    ) {
      return { rowCount: 1, rows: [{ column_name: "source_query" }] };
    }

    if (
      text.startsWith("SELECT COUNT(*)::int AS total FROM project_articles pa")
    ) {
      return { rowCount: 1, rows: [{ total: 2 }] };
    }

    if (
      text.startsWith(
        "SELECT status, COUNT(*)::int as count FROM project_articles WHERE project_id = $1 GROUP BY status",
      )
    ) {
      return {
        rowCount: 2,
        rows: [
          { status: "candidate", count: 1 },
          { status: "selected", count: 1 },
        ],
      };
    }

    if (
      text.startsWith(
        "SELECT DISTINCT source_query FROM project_articles WHERE project_id = $1 AND source_query IS NOT NULL ORDER BY source_query",
      )
    ) {
      return {
        rowCount: 1,
        rows: [{ source_query: "hypertension" }],
      };
    }

    if (
      text.startsWith("SELECT a.id, a.doi, a.pmid, a.title_en, a.title_ru,")
    ) {
      const rows = [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          doi: null,
          pmid: "111",
          title_en: "Article A",
          title_ru: null,
          abstract_en: null,
          abstract_ru: null,
          authors: ["A"],
          year: 2024,
          journal: "J1",
          url: null,
          source: "pubmed",
          has_stats: false,
          stats_json: null,
          stats_quality: 0,
          publication_types: [],
          created_at: "2026-01-01T00:00:00.000Z",
          status: "candidate",
          notes: null,
          tags: [],
          added_at: "2026-01-01T00:00:00.000Z",
          source_query: "hypertension",
        },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          doi: null,
          pmid: "222",
          title_en: "Article B",
          title_ru: null,
          abstract_en: null,
          abstract_ru: null,
          authors: ["B"],
          year: 2025,
          journal: "J2",
          url: null,
          source: "pubmed",
          has_stats: true,
          stats_json: null,
          stats_quality: 1,
          publication_types: [],
          created_at: "2026-01-02T00:00:00.000Z",
          status: "selected",
          notes: null,
          tags: [],
          added_at: "2026-01-02T00:00:00.000Z",
          source_query: "hypertension",
        },
      ];

      const limit = Number(params[1] ?? rows.length);
      const offset = Number(params[2] ?? 0);
      return {
        rowCount: Math.max(rows.slice(offset, offset + limit).length, 0),
        rows: rows.slice(offset, offset + limit),
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");
  const { default: articlesRoutes } =
    await import("../../src/routes/articles.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(articlesRoutes, { prefix: "/api" });
  return app;
}

describe("Articles list pagination", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
  });

  it("returns paginated /api/projects/:id/articles response", async () => {
    const projectId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const userId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const app = await buildArticlesApp(projectId, userId);

    const token = app.jwt.sign({
      sub: userId,
      email: "owner@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/articles?page=2&limit=1&sortBy=added_at&sortOrder=desc`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      articles: [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }],
      total: 2,
      pagination: {
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      },
      counts: {
        candidate: 1,
        selected: 1,
        excluded: 0,
        deleted: 0,
      },
      searchQueries: ["hypertension"],
    });

    await app.close();
  });
});
