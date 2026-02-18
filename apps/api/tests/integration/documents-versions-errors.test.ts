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
  process.env.JWT_SECRET = "test-jwt-secret-for-doc-versions-errors";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

type BuildVersionsAppOptions = {
  projectId: string;
  userId: string;
  hasAccess: boolean;
  missingVersionsTable?: boolean;
  existingVersion?: boolean;
};

async function buildVersionsApp(options: BuildVersionsAppOptions) {
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
      if (
        options.hasAccess &&
        params[0] === options.projectId &&
        params[1] === options.userId
      ) {
        return { rowCount: 1, rows: [{ role: "owner" }] };
      }
      return { rowCount: 0, rows: [] };
    }

    if (
      text.startsWith(
        "SELECT id, version_number, version_type, version_note, content_length, created_at,",
      )
    ) {
      if (options.missingVersionsTable) {
        throw new Error('relation "document_versions" does not exist');
      }
      return {
        rowCount: 1,
        rows: [
          {
            id: "f8fe97c3-0ca6-4f89-bf76-d2b2006de2d2",
            version_number: 1,
            version_type: "manual",
            version_note: null,
            content_length: 120,
            created_at: new Date().toISOString(),
            created_by_email: "owner@example.com",
          },
        ],
      };
    }

    if (
      text.startsWith(
        "SELECT * FROM document_versions WHERE id = $1 AND document_id = $2",
      )
    ) {
      if (options.existingVersion) {
        return {
          rowCount: 1,
          rows: [{ id: params[0], document_id: params[1], content: "ok" }],
        };
      }
      return { rowCount: 0, rows: [] };
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");
  const { default: versionsPlugin } =
    await import("../../src/routes/documents/versions.js");
  const { setupErrorHandler, setupNotFoundHandler } =
    await import("../../src/utils/errors.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  setupErrorHandler(app);
  setupNotFoundHandler(app);
  await app.register(versionsPlugin, { prefix: "/api" });
  return app;
}

describe("Document versions typed errors", () => {
  const projectId = "a7c2c915-c991-4e5f-b4e1-8f470f65f0ad";
  const docId = "012d975e-fd3e-4d3d-b669-3657a5668f3f";
  const versionId = "6207f658-62fe-4dde-8932-fadcc7ad16e8";
  const userId = "5f6c76d1-8cb6-4a35-b31e-c9acdb9f6e12";

  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
  });

  it("returns VALIDATION_ERROR for invalid params", async () => {
    const app = await buildVersionsApp({
      projectId,
      userId,
      hasAccess: true,
    });

    const token = app.jwt.sign({
      sub: userId,
      email: "owner@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/projects/not-a-uuid/documents/also-not-uuid/versions",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid params",
      },
    });

    await app.close();
  });

  it("returns AUTHORIZATION_ERROR when user has no project access", async () => {
    const app = await buildVersionsApp({
      projectId,
      userId,
      hasAccess: false,
    });

    const token = app.jwt.sign({
      sub: userId,
      email: "member@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/documents/${docId}/versions`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: {
        code: "AUTHORIZATION_ERROR",
        message: "No access",
      },
    });

    await app.close();
  });

  it("returns NOT_FOUND when requested version does not exist", async () => {
    const app = await buildVersionsApp({
      projectId,
      userId,
      hasAccess: true,
      existingVersion: false,
    });

    const token = app.jwt.sign({
      sub: userId,
      email: "owner@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/documents/${docId}/versions/${versionId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: {
        code: "NOT_FOUND",
      },
    });

    await app.close();
  });

  it("keeps backward-compatible tableNotReady response when table is missing", async () => {
    const app = await buildVersionsApp({
      projectId,
      userId,
      hasAccess: true,
      missingVersionsTable: true,
    });

    const token = app.jwt.sign({
      sub: userId,
      email: "owner@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/documents/${docId}/versions`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      versions: [],
      tableNotReady: true,
    });

    await app.close();
  });
});
