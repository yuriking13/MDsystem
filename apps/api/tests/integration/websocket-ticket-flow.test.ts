import WebSocket from "ws";
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
  process.env.JWT_SECRET = "test-jwt-secret-for-websocket-ticket-flow";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

async function waitForCloseCode(ws: WebSocket): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for websocket close"));
    }, 2000);

    ws.once("close", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
    ws.once("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function waitForFirstMessage(
  ws: WebSocket,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for websocket message"));
    }, 2000);

    ws.once("message", (raw) => {
      clearTimeout(timeout);
      try {
        const parsed = JSON.parse(raw.toString()) as Record<string, unknown>;
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    ws.once("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

describe("WebSocket ticket flow", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
  });

  it("issues one-time ws ticket and accepts valid handshake", async () => {
    setTestEnv();
    const projectId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const userId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

    queryMock.mockImplementation(
      async (sql: string, params: unknown[] = []) => {
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

        throw new Error(`Unexpected query: ${text}`);
      },
    );

    const { default: Fastify } = await import("fastify");
    const { default: authPlugin } = await import("../../src/auth.js");
    const { registerWebSocket } = await import("../../src/websocket.js");

    const app = Fastify({ logger: false });
    await app.register(authPlugin);
    await registerWebSocket(app);

    const listenUrl = await app.listen({ host: "127.0.0.1", port: 0 });
    const base = new URL(listenUrl);
    const token = app.jwt.sign({
      sub: userId,
      email: "owner@example.com",
      type: "access",
    });

    const ticketResponse = await app.inject({
      method: "POST",
      url: "/api/ws-ticket",
      headers: { authorization: `Bearer ${token}` },
      payload: { projectId },
    });

    expect(ticketResponse.statusCode).toBe(200);
    const { ticket } = ticketResponse.json() as { ticket: string };
    expect(ticket).toBeTypeOf("string");
    expect(ticket.length).toBeGreaterThan(10);

    const ws = new WebSocket(
      `ws://${base.hostname}:${base.port}/ws/project/${projectId}?ticket=${ticket}`,
    );
    const connected = await waitForFirstMessage(ws);
    expect(connected.type).toBe("connected");
    ws.close();

    const wsReuse = new WebSocket(
      `ws://${base.hostname}:${base.port}/ws/project/${projectId}?ticket=${ticket}`,
    );
    const reuseCloseCode = await waitForCloseCode(wsReuse);
    expect(reuseCloseCode).toBe(4001);

    await app.close();
  });
});
