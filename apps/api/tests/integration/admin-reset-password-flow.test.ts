import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, hashPasswordMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  hashPasswordMock: vi.fn(),
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
  verifyPassword: vi.fn(async () => true),
  hashPassword: hashPasswordMock,
}));

function setTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.HOST = "127.0.0.1";
  process.env.PORT = "3001";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/mdsystem_test";
  process.env.JWT_SECRET = "test-jwt-secret-for-admin-reset-password";
  process.env.API_KEY_ENCRYPTION_SECRET =
    "test-api-key-secret-32-characters-ok";
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.CROSSREF_MAILTO = "test@example.com";
}

describe("Admin reset-password secure flow", () => {
  beforeEach(() => {
    vi.resetModules();
    queryMock.mockReset();
    hashPasswordMock.mockReset();
    hashPasswordMock.mockResolvedValue("hashed-random-secret");
  });

  it("returns one-time reset link and never returns tempPassword", async () => {
    setTestEnv();
    const userId = "11111111-1111-4111-8111-111111111111";
    const adminId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

    let savedTokenHash: string | null = null;
    let auditDetails: Record<string, unknown> | null = null;

    queryMock.mockImplementation(
      async (sql: string, params: unknown[] = []) => {
        const text = sql.replace(/\s+/g, " ").trim();

        if (text.startsWith("SELECT is_admin FROM users WHERE id = $1")) {
          return { rowCount: 1, rows: [{ is_admin: true }] };
        }

        if (
          text.startsWith(
            "UPDATE users SET password_hash = $1, password_reset_required = true WHERE id = $2",
          )
        ) {
          return { rowCount: 1, rows: [] };
        }

        if (
          text.startsWith(
            "DELETE FROM password_reset_tokens WHERE user_id = $1",
          )
        ) {
          return { rowCount: 1, rows: [] };
        }

        if (text.startsWith("INSERT INTO password_reset_tokens")) {
          savedTokenHash = String(params[1] ?? "");
          return { rowCount: 1, rows: [] };
        }

        if (
          text.startsWith(
            "UPDATE refresh_tokens SET revoked = true WHERE user_id = $1",
          )
        ) {
          return { rowCount: 1, rows: [] };
        }

        if (text.startsWith("INSERT INTO admin_audit_log")) {
          auditDetails =
            typeof params[4] === "string"
              ? (JSON.parse(params[4]) as Record<string, unknown>)
              : null;
          return { rowCount: 1, rows: [] };
        }

        throw new Error(`Unexpected query: ${text}`);
      },
    );

    const { default: Fastify } = await import("fastify");
    const { default: authPlugin } = await import("../../src/auth.js");
    const { adminRoutes } = await import("../../src/routes/admin/full.js");

    const app = Fastify({ logger: false });
    await app.register(authPlugin);
    await app.register(adminRoutes);

    const adminToken = app.jwt.sign({
      sub: adminId,
      email: "admin@example.com",
      type: "access",
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/users/${userId}/reset-password`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as {
      resetLink: string;
      expiresAt: string;
      message: string;
      tempPassword?: string;
    };

    expect(payload.tempPassword).toBeUndefined();
    expect(payload.resetLink).toContain("/reset-password?token=");
    expect(payload.expiresAt).toBeTruthy();
    expect(payload.message).toContain("one-time reset link");

    const resetToken = new URL(payload.resetLink).searchParams.get("token");
    expect(resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(savedTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(savedTokenHash).not.toBe(resetToken);

    expect(hashPasswordMock).toHaveBeenCalledTimes(1);
    expect(auditDetails).toMatchObject({
      resetLinkIssued: true,
    });

    await app.close();
  });
});
