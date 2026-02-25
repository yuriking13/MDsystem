import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, connectMock, checkProjectAccessPoolMock } = vi.hoisted(
  () => ({
    queryMock: vi.fn(),
    connectMock: vi.fn(),
    checkProjectAccessPoolMock: vi.fn(),
  }),
);

vi.mock("../../src/pg.js", () => ({
  pool: {
    query: queryMock,
    connect: connectMock,
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  },
}));

vi.mock("../../src/utils/project-access.js", () => ({
  checkProjectAccessPool: checkProjectAccessPoolMock,
}));

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.HOST = "127.0.0.1";
  process.env.PORT = "3001";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/mdsystem_test";
  process.env.JWT_SECRET = "test-jwt-secret-for-med-publisher-tests";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

async function buildApp() {
  setTestEnv();
  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");
  const { default: medPublisherRoutes } =
    await import("../../src/routes/med-publisher.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(medPublisherRoutes, { prefix: "/api" });
  return app;
}

function makeClient(
  handlers: Record<
    string,
    () => { rowCount: number; rows: Record<string, unknown>[] }
  >,
) {
  return {
    query: vi.fn(async (sql: string) => {
      const normalized = sql.replace(/\s+/g, " ").trim();
      for (const key of Object.keys(handlers)) {
        if (normalized.startsWith(key)) return handlers[key]();
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    }),
    release: vi.fn(),
  };
}

describe("med publisher critical routes", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
    connectMock.mockReset();
    checkProjectAccessPoolMock.mockReset();
  });

  it("returns project-scoped dashboard for authorized member", async () => {
    const projectId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const app = await buildApp();
    const token = app.jwt.sign({
      sub: userId,
      email: "user@example.com",
      type: "access",
    });

    checkProjectAccessPoolMock.mockResolvedValue({ ok: true, canEdit: true });

    queryMock.mockImplementation(async (sql: string) => {
      const text = sql.replace(/\s+/g, " ").trim();
      if (text.startsWith("SELECT is_blocked FROM users WHERE id = $1")) {
        return { rowCount: 1, rows: [{ is_blocked: false }] };
      }
      if (
        text.startsWith(
          "SELECT user_id, role, is_active, can_publish FROM med_publisher_editors WHERE user_id = $1 LIMIT 1",
        )
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              user_id: userId,
              role: "editor",
              is_active: true,
              can_publish: true,
            },
          ],
        };
      }
      if (
        text.startsWith(
          "SELECT s.*, author.email AS author_email, handling.email AS handling_editor_email,",
        )
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              id: "sub-1",
              title: "Submission",
              status: "draft",
              project_id: projectId,
              author_email: "author@example.com",
              handling_editor_email: "editor@example.com",
              reviewers_total: 0,
              reviewers_completed: 0,
            },
          ],
        };
      }
      if (
        text.startsWith(
          "SELECT r.id AS review_id, r.submission_id, r.status AS review_status",
        )
      ) {
        return { rowCount: 0, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${text}`);
    });

    const res = await app.inject({
      method: "GET",
      url: `/api/med/publisher/project/${projectId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      submissions: [{ project_id: projectId, title: "Submission" }],
      isEditor: true,
      editorRole: "editor",
    });
    expect(checkProjectAccessPoolMock).toHaveBeenCalledWith(
      projectId,
      userId,
      false,
    );
    await app.close();
  });

  it("rejects create submission with projectId when user lacks edit access", async () => {
    const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const projectId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const app = await buildApp();
    const token = app.jwt.sign({
      sub: userId,
      email: "user@example.com",
      type: "access",
    });

    checkProjectAccessPoolMock.mockResolvedValue({ ok: false, canEdit: false });
    queryMock.mockImplementation(async (sql: string) => {
      const text = sql.replace(/\s+/g, " ").trim();
      if (text.startsWith("SELECT is_blocked FROM users WHERE id = $1")) {
        return { rowCount: 1, rows: [{ is_blocked: false }] };
      }
      throw new Error(`Unexpected SQL: ${text}`);
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/med/publisher/submissions",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Valid title",
        abstract: "A sufficiently long abstract for validation.",
        keywords: ["science"],
        manuscript: "text",
        projectId,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: "Forbidden" });
    await app.close();
  });

  it("rejects assigning author as reviewer", async () => {
    const userId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const submissionId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const app = await buildApp();
    const token = app.jwt.sign({
      sub: userId,
      email: "editor@example.com",
      type: "access",
    });

    queryMock.mockImplementation(async (sql: string) => {
      const text = sql.replace(/\s+/g, " ").trim();
      if (text.startsWith("SELECT is_blocked FROM users WHERE id = $1")) {
        return { rowCount: 1, rows: [{ is_blocked: false }] };
      }
      if (text.startsWith("SELECT s.created_by, s.handling_editor_id,")) {
        return {
          rowCount: 1,
          rows: [
            {
              created_by: "author-id",
              handling_editor_id: userId,
              is_reviewer: false,
            },
          ],
        };
      }
      if (
        text.startsWith(
          "SELECT user_id, role, is_active, can_publish FROM med_publisher_editors WHERE user_id = $1 LIMIT 1",
        )
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              user_id: userId,
              role: "editor",
              is_active: true,
              can_publish: true,
            },
          ],
        };
      }
      if (
        text.startsWith(
          "SELECT created_by, status FROM med_publisher_submissions WHERE id = $1 LIMIT 1",
        )
      ) {
        return {
          rowCount: 1,
          rows: [{ created_by: "author-id", status: "under_review" }],
        };
      }
      if (
        text.startsWith(
          "SELECT id, email FROM users WHERE lower(email) = lower($1) LIMIT 1",
        )
      ) {
        return {
          rowCount: 1,
          rows: [{ id: "author-id", email: "author@example.com" }],
        };
      }
      throw new Error(`Unexpected SQL: ${text}`);
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/med/publisher/submissions/${submissionId}/reviewers`,
      headers: { authorization: `Bearer ${token}` },
      payload: { reviewerEmail: "author@example.com" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "BadRequest",
      message: "Submission author cannot be assigned as reviewer",
    });
    await app.close();
  });

  it("rejects decision when no submitted reviews", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const submissionId = "22222222-2222-4222-8222-222222222222";
    const app = await buildApp();
    const token = app.jwt.sign({
      sub: userId,
      email: "editor@example.com",
      type: "access",
    });

    queryMock.mockImplementation(async (sql: string) => {
      const text = sql.replace(/\s+/g, " ").trim();
      if (text.startsWith("SELECT is_blocked FROM users WHERE id = $1")) {
        return { rowCount: 1, rows: [{ is_blocked: false }] };
      }
      if (text.startsWith("SELECT s.created_by, s.handling_editor_id,")) {
        return {
          rowCount: 1,
          rows: [
            {
              created_by: "author-id",
              handling_editor_id: userId,
              is_reviewer: false,
            },
          ],
        };
      }
      if (
        text.startsWith(
          "SELECT user_id, role, is_active, can_publish FROM med_publisher_editors WHERE user_id = $1 LIMIT 1",
        )
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              user_id: userId,
              role: "editor",
              is_active: true,
              can_publish: true,
            },
          ],
        };
      }
      throw new Error(`Unexpected SQL: ${text}`);
    });

    const client = makeClient({
      BEGIN: () => ({ rowCount: 0, rows: [] }),
      "SELECT status FROM med_publisher_submissions WHERE id = $1 AND handling_editor_id = $2 FOR UPDATE":
        () => ({
          rowCount: 1,
          rows: [{ status: "under_review" }],
        }),
      "SELECT COUNT(*)::int AS submitted_count FROM med_publisher_reviews WHERE submission_id = $1 AND status = 'submitted'":
        () => ({
          rowCount: 1,
          rows: [{ submitted_count: 0 }],
        }),
      ROLLBACK: () => ({ rowCount: 0, rows: [] }),
    });
    connectMock.mockResolvedValue(client);

    const res = await app.inject({
      method: "POST",
      url: `/api/med/publisher/submissions/${submissionId}/decision`,
      headers: { authorization: `Bearer ${token}` },
      payload: { decision: "accepted", note: "ok" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "BadRequest",
      message: "Editorial decision requires at least one submitted review",
    });
    await app.close();
  });
});
