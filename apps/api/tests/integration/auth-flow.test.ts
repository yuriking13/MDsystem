import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, verifyPasswordMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
}));

vi.mock("../../src/pg.js", () => ({
  pool: {
    query: queryMock,
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  },
}));

vi.mock("../../src/lib/password.js", () => ({
  hashPassword: vi.fn(async (password: string) => `hash:${password}`),
  verifyPassword: verifyPasswordMock,
}));

vi.mock("../../src/plugins/rate-limit.js", () => ({
  rateLimits: {
    register: async () => undefined,
    login: async () => undefined,
    api: async () => undefined,
  },
}));

type RefreshTokenState = {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  revoked: boolean;
};

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.HOST = "127.0.0.1";
  process.env.PORT = "3001";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/mdsystem_test";
  process.env.JWT_SECRET = "test-jwt-secret-for-auth-flow-tests";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

function toTokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createAuthDbState(options?: { blocked?: boolean }) {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "user@example.com",
    password_hash: "stored-hash",
    is_blocked: Boolean(options?.blocked),
  };
  const refreshTokens = new Map<string, RefreshTokenState>();

  const query = async (
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rowCount: number; rows: Record<string, unknown>[] }> => {
    const text = sql.replace(/\s+/g, " ").trim();

    if (
      text.startsWith(
        "SELECT id, email, password_hash, is_blocked FROM users WHERE email=$1",
      )
    ) {
      if (params[0] !== user.email) {
        return { rowCount: 0, rows: [] };
      }
      return { rowCount: 1, rows: [user] };
    }

    if (text.startsWith("UPDATE users SET last_login_at=now() WHERE id=$1")) {
      return { rowCount: params[0] === user.id ? 1 : 0, rows: [] };
    }

    if (
      text.startsWith(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      )
    ) {
      const tokenHash = String(params[1]);
      refreshTokens.set(tokenHash, {
        id: tokenHash,
        userId: String(params[0]),
        expiresAt: new Date(String(params[2])),
        createdAt: new Date(),
        revoked: false,
      });
      return { rowCount: 1, rows: [] };
    }

    if (
      text.startsWith(
        "DELETE FROM refresh_tokens WHERE user_id = $1 AND (revoked = true OR expires_at < now())",
      )
    ) {
      let deleted = 0;
      for (const [tokenHash, token] of refreshTokens.entries()) {
        if (
          token.userId === params[0] &&
          (token.revoked || token.expiresAt.getTime() < Date.now())
        ) {
          refreshTokens.delete(tokenHash);
          deleted++;
        }
      }
      return { rowCount: deleted, rows: [] };
    }

    if (
      text.includes(
        "ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) AS rn",
      ) &&
      text.includes("UPDATE refresh_tokens rt SET revoked = true")
    ) {
      const userId = String(params[0]);
      const maxActive = Number(params[1]);

      const activeTokens = Array.from(refreshTokens.entries())
        .filter(([, token]) => {
          return (
            token.userId === userId &&
            !token.revoked &&
            token.expiresAt.getTime() > Date.now()
          );
        })
        .sort((a, b) => {
          const byCreated = b[1].createdAt.getTime() - a[1].createdAt.getTime();
          if (byCreated !== 0) return byCreated;
          return b[0].localeCompare(a[0]);
        });

      let affected = 0;
      for (const [, token] of activeTokens.slice(maxActive)) {
        if (!token.revoked) {
          token.revoked = true;
          affected++;
        }
      }
      return { rowCount: affected, rows: [] };
    }

    if (
      text.startsWith(
        "SELECT rt.user_id, u.email, u.is_blocked, rt.expires_at FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = $1 AND rt.revoked = false",
      )
    ) {
      const tokenHash = String(params[0]);
      const token = refreshTokens.get(tokenHash);
      if (!token || token.revoked) {
        return { rowCount: 0, rows: [] };
      }
      return {
        rowCount: 1,
        rows: [
          {
            user_id: token.userId,
            email: user.email,
            is_blocked: user.is_blocked,
            expires_at: token.expiresAt.toISOString(),
          },
        ],
      };
    }

    if (
      text.startsWith(
        "UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1",
      )
    ) {
      const tokenHash = String(params[0]);
      const token = refreshTokens.get(tokenHash);
      if (!token) {
        return { rowCount: 0, rows: [] };
      }
      token.revoked = true;
      return { rowCount: 1, rows: [] };
    }

    if (
      text.startsWith(
        "UPDATE refresh_tokens SET revoked = true WHERE user_id = $1",
      )
    ) {
      let affected = 0;
      for (const token of refreshTokens.values()) {
        if (token.userId === params[0]) {
          token.revoked = true;
          affected++;
        }
      }
      return { rowCount: affected, rows: [] };
    }

    if (text.startsWith("SELECT is_blocked FROM users WHERE id = $1")) {
      if (params[0] !== user.id) {
        return { rowCount: 0, rows: [] };
      }
      return { rowCount: 1, rows: [{ is_blocked: user.is_blocked }] };
    }

    throw new Error(`Unexpected query: ${text}`);
  };

  return {
    user,
    query,
    getTokenState: (token: string) => refreshTokens.get(toTokenHash(token)),
    activeTokensCount: () =>
      Array.from(refreshTokens.values()).filter((token) => !token.revoked)
        .length,
  };
}

async function buildAuthApp(state: ReturnType<typeof createAuthDbState>) {
  setTestEnv();
  queryMock.mockImplementation(state.query);
  verifyPasswordMock.mockImplementation(
    async (hash: string, password: string) =>
      hash === "stored-hash" && password === "valid-password",
  );

  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");
  const { authRoutes } = await import("../../src/routes/auth.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  await authRoutes(app);
  return app;
}

describe("Auth critical flow", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
    verifyPasswordMock.mockReset();
  });

  it("supports login -> refresh -> logout -> logout-all", async () => {
    const state = createAuthDbState();
    const app = await buildAuthApp(state);

    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: state.user.email, password: "valid-password" },
    });
    expect(loginRes.statusCode).toBe(200);
    const loginPayload = loginRes.json();
    expect(loginPayload).toHaveProperty("accessToken");
    expect(loginPayload).toHaveProperty("refreshToken");
    expect(state.activeTokensCount()).toBe(1);

    const firstRefreshToken = loginPayload.refreshToken as string;
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken: firstRefreshToken },
    });
    expect(refreshRes.statusCode).toBe(200);
    const refreshPayload = refreshRes.json();
    expect(refreshPayload.refreshToken).not.toBe(firstRefreshToken);
    const firstTokenState = state.getTokenState(firstRefreshToken);
    expect(firstTokenState === undefined || firstTokenState.revoked).toBe(true);
    expect(state.activeTokensCount()).toBe(1);

    const latestAccessToken = refreshPayload.accessToken as string;
    const latestRefreshToken = refreshPayload.refreshToken as string;

    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { authorization: `Bearer ${latestAccessToken}` },
      payload: { refreshToken: latestRefreshToken },
    });
    expect(logoutRes.statusCode).toBe(200);
    expect(state.getTokenState(latestRefreshToken)?.revoked).toBe(true);

    const logoutAllRes = await app.inject({
      method: "POST",
      url: "/api/auth/logout-all",
      headers: { authorization: `Bearer ${latestAccessToken}` },
    });
    expect(logoutAllRes.statusCode).toBe(200);
    expect(state.activeTokensCount()).toBe(0);

    await app.close();
  });

  it("rejects blocked user at login", async () => {
    const state = createAuthDbState({ blocked: true });
    const app = await buildAuthApp(state);

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: state.user.email, password: "valid-password" },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      error: "AccountBlocked",
    });

    await app.close();
  });

  it("limits active refresh tokens per user", async () => {
    const state = createAuthDbState();
    const app = await buildAuthApp(state);

    for (let i = 0; i < 7; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: state.user.email, password: "valid-password" },
      });
      expect(res.statusCode).toBe(200);
    }

    expect(state.activeTokensCount()).toBe(5);
    await app.close();
  });

  it("runs password verification path for unknown users", async () => {
    const state = createAuthDbState();
    const app = await buildAuthApp(state);

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "missing@example.com", password: "any-password" },
    });

    expect(res.statusCode).toBe(401);
    expect(verifyPasswordMock).toHaveBeenCalledTimes(1);
    expect(verifyPasswordMock.mock.calls[0][1]).toBe("any-password");

    await app.close();
  });
});
