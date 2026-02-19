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

vi.mock("../../src/db.js", () => ({
  prisma: {
    projectMember: { findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
    $disconnect: vi.fn(),
  },
}));

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.HOST = "127.0.0.1";
  process.env.PORT = "3001";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/mdsystem_test";
  process.env.JWT_SECRET = "test-jwt-secret-for-article-document-xss";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

async function buildArticlesApp(options: {
  projectId: string;
  userId: string;
  articleId: string;
}) {
  setTestEnv();

  let insertedContent = "";

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
      return {
        rowCount:
          params[0] === options.projectId && params[1] === options.userId
            ? 1
            : 0,
        rows:
          params[0] === options.projectId && params[1] === options.userId
            ? [{ role: "owner" }]
            : [],
      };
    }

    if (
      text.startsWith(
        "SELECT a.*, pa.status FROM articles a JOIN project_articles pa",
      )
    ) {
      return {
        rowCount: 1,
        rows: [
          {
            id: options.articleId,
            status: "candidate",
            title_en: `<img src=x onerror=alert("article-title")>`,
            title_ru: null,
            authors: [
              `Alice <img src=x onerror=alert("author-1")>`,
              `Bob<script>alert("author-2")</script>`,
            ],
            year: 2026,
            journal: `<script>alert("journal")</script>Nature`,
            volume: `1"><img src=x onerror=alert("vol")>`,
            issue: `2<script>alert("issue")</script>`,
            pages: `3-4"><img src=x onerror=alert("pages")>`,
            doi: `10.1000/evil"><script>alert("doi")</script>`,
            abstract_en: `<img src=x onerror=alert("abstract")>Some abstract`,
            abstract_ru: null,
            extracted_bibliography: null,
          },
        ],
      };
    }

    if (
      text.startsWith(
        "SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM documents WHERE project_id = $1",
      )
    ) {
      return { rowCount: 1, rows: [{ next_order: 0 }] };
    }

    if (
      text.startsWith(
        "INSERT INTO documents (project_id, title, content, order_index, created_by)",
      )
    ) {
      insertedContent = String(params[2] ?? "");
      return {
        rowCount: 1,
        rows: [
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            title: params[1],
          },
        ],
      };
    }

    if (text.startsWith("SELECT column_name FROM information_schema.columns")) {
      return { rowCount: 0, rows: [] };
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

  return { app, getInsertedContent: () => insertedContent };
}

describe("Article convert-to-document XSS hardening", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
  });

  it("escapes untrusted fields and encodes DOI links", async () => {
    const projectId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const articleId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const { app, getInsertedContent } = await buildArticlesApp({
      projectId,
      userId,
      articleId,
    });

    const token = app.jwt.sign({
      sub: userId,
      email: "owner@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/articles/${articleId}/convert-to-document`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        includeBibliography: false,
        documentTitle: `<script>alert("document-title")</script>`,
      },
    });

    expect(response.statusCode).toBe(200);

    const content = getInsertedContent();
    expect(content).not.toContain("<script>");
    expect(content).not.toContain("<img");

    expect(content).toContain(
      "&lt;script&gt;alert(&quot;document-title&quot;)&lt;/script&gt;",
    );
    expect(content).toContain(
      "&lt;script&gt;alert(&quot;journal&quot;)&lt;/script&gt;Nature",
    );
    expect(content).toContain(
      'href="https://doi.org/10.1000%2Fevil%22%3E%3Cscript%3Ealert(%22doi%22)%3C%2Fscript%3E"',
    );
    expect(content).toContain(
      "10.1000/evil&quot;&gt;&lt;script&gt;alert(&quot;doi&quot;)&lt;/script&gt;",
    );

    await app.close();
  });
});
