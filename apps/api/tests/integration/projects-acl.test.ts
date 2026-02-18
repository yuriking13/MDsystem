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
  process.env.JWT_SECRET = "test-jwt-secret-for-project-acl-tests";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

async function buildProjectsApp(options: {
  projectId: string;
  userId: string;
  roleRef: { current: "viewer" | "editor" | "owner" };
  autoGraphSyncColumnExists?: boolean;
}) {
  setTestEnv();
  queryMock.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const text = sql.replace(/\s+/g, " ").trim();

    if (text.startsWith("SELECT is_blocked FROM users WHERE id = $1")) {
      return { rowCount: 1, rows: [{ is_blocked: false }] };
    }

    if (
      text.startsWith(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'auto_graph_sync_enabled' LIMIT 1",
      )
    ) {
      if (options.autoGraphSyncColumnExists === false) {
        return { rowCount: 0, rows: [] };
      }

      return { rowCount: 1, rows: [{ "?column?": 1 }] };
    }

    if (
      text.startsWith(
        "SELECT p.id, p.name, p.description, p.created_at, p.updated_at,",
      )
    ) {
      return {
        rowCount: 1,
        rows: [
          {
            id: options.projectId,
            name: "Project",
            description: null,
            citation_style: "gost",
            role: options.roleRef.current,
            research_type: null,
            research_subtype: null,
            research_protocol: null,
            protocol_custom_name: null,
            ai_error_analysis_enabled: false,
            ai_protocol_check_enabled: false,
            auto_graph_sync_enabled: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
    }

    if (
      text.startsWith(
        "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
      )
    ) {
      if (params[0] !== options.projectId || params[1] !== options.userId) {
        return { rowCount: 0, rows: [] };
      }
      return {
        rowCount: 1,
        rows: [{ role: options.roleRef.current }],
      };
    }

    if (text.startsWith("UPDATE projects SET")) {
      return {
        rowCount: 1,
        rows: [
          {
            id: options.projectId,
            name: "Updated project",
            description: null,
            citation_style: "gost",
            research_type: null,
            research_subtype: null,
            research_protocol: null,
            protocol_custom_name: null,
            ai_error_analysis_enabled: false,
            ai_protocol_check_enabled: false,
            auto_graph_sync_enabled: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");
  const { default: projectsRoutes } =
    await import("../../src/routes/projects.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await app.register(projectsRoutes, { prefix: "/api" });
  return app;
}

describe("Projects ACL", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
  });

  it("forbids project update for viewer and allows owner", async () => {
    const projectId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const roleRef: { current: "viewer" | "editor" | "owner" } = {
      current: "viewer",
    };
    const app = await buildProjectsApp({ projectId, userId, roleRef });

    const token = app.jwt.sign({
      sub: userId,
      email: "member@example.com",
      type: "access",
    });

    const denied = await app.inject({
      method: "PATCH",
      url: `/api/projects/${projectId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Attempt as viewer" },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toMatchObject({ error: "Forbidden" });

    roleRef.current = "owner";

    const allowed = await app.inject({
      method: "PATCH",
      url: `/api/projects/${projectId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Updated project" },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toMatchObject({
      project: { id: projectId, role: "owner" },
    });

    await app.close();
  });

  it("loads project when auto graph sync column is missing", async () => {
    const projectId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const userId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const roleRef: { current: "viewer" | "editor" | "owner" } = {
      current: "owner",
    };

    const app = await buildProjectsApp({
      projectId,
      userId,
      roleRef,
      autoGraphSyncColumnExists: false,
    });

    const token = app.jwt.sign({
      sub: userId,
      email: "owner@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      project: { id: projectId, auto_graph_sync_enabled: false },
    });

    await app.close();
  });

  it("updates project without touching missing auto graph sync column", async () => {
    const projectId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const userId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const roleRef: { current: "viewer" | "editor" | "owner" } = {
      current: "owner",
    };

    const app = await buildProjectsApp({
      projectId,
      userId,
      roleRef,
      autoGraphSyncColumnExists: false,
    });

    const token = app.jwt.sign({
      sub: userId,
      email: "owner@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/projects/${projectId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Updated project", autoGraphSyncEnabled: true },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      project: { id: projectId, role: "owner", auto_graph_sync_enabled: false },
    });

    const updateQueries = queryMock.mock.calls
      .map(([sql]) => String(sql).replace(/\s+/g, " ").trim())
      .filter((text) => text.startsWith("UPDATE projects SET"));
    expect(updateQueries).toHaveLength(1);
    expect(updateQueries[0]).not.toContain("auto_graph_sync_enabled =");

    await app.close();
  });
});
