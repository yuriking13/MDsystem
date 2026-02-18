import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(async () => ({ rowCount: 0, rows: [] as unknown[] })),
}));

vi.mock("../../src/pg.js", () => ({
  pool: {
    query: queryMock,
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
    on: vi.fn(),
  },
}));

const BASE_ENV: Record<string, string> = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: "3001",
  DATABASE_URL: "postgresql://test:test@localhost:5432/mdsystem_test",
  JWT_SECRET: "jwt-secret-placeholder-1234567890",
  JWT_SECRET_KID: "k-current",
  JWT_ROTATION_MODE: "stable",
  API_KEY_ENCRYPTION_SECRET: "api-key-secret-for-jwt-rotation-tests-12345",
  CORS_ORIGIN: "http://localhost:5173",
  CROSSREF_MAILTO: "test@example.com",
};

function setEnv(overrides: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(BASE_ENV)) {
    process.env[key] = value;
  }

  const keysToReset = [
    "JWT_SECRET_PREVIOUS",
    "JWT_SECRET_PREVIOUS_KID",
    "JWT_ROTATION_STARTED_AT",
    "JWT_ROTATION_WINDOW_MINUTES",
  ];
  for (const key of keysToReset) {
    delete process.env[key];
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
}

async function buildJwtVerifierApp(
  overrides: Record<string, string | undefined>,
) {
  setEnv(overrides);
  vi.resetModules();

  const { default: Fastify } = await import("fastify");
  const { default: authPlugin } = await import("../../src/auth.js");

  const app = Fastify({ logger: false });
  await app.register(authPlugin);
  app.get("/verify", async (req, reply) => {
    try {
      await req.jwtVerify();
      return { ok: true, sub: req.user.sub };
    } catch {
      return reply.code(401).send({ ok: false });
    }
  });
  return app;
}

describe("JWT key rotation verification", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockImplementation(async () => ({ rowCount: 0, rows: [] }));
  });

  it("accepts tokens signed with previous key during rotation window", async () => {
    const oldSecret = "jwt-old-secret-for-rotation-tests-1234567890";
    const newSecret = "jwt-new-secret-for-rotation-tests-1234567890";

    const oldKeyApp = await buildJwtVerifierApp({
      JWT_SECRET: oldSecret,
      JWT_SECRET_KID: "k-old",
      JWT_ROTATION_MODE: "stable",
    });

    const oldToken = oldKeyApp.jwt.sign({
      sub: "user-rotation",
      email: "rotation@example.com",
      type: "access",
    });
    await oldKeyApp.close();

    const rotationApp = await buildJwtVerifierApp({
      JWT_SECRET: newSecret,
      JWT_SECRET_KID: "k-new",
      JWT_SECRET_PREVIOUS: oldSecret,
      JWT_SECRET_PREVIOUS_KID: "k-old",
      JWT_ROTATION_MODE: "rotation",
      JWT_ROTATION_STARTED_AT: new Date().toISOString(),
      JWT_ROTATION_WINDOW_MINUTES: "60",
    });

    const response = await rotationApp.inject({
      method: "GET",
      url: "/verify",
      headers: {
        authorization: `Bearer ${oldToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, sub: "user-rotation" });
    await rotationApp.close();
  });

  it("rejects old-key tokens after previous key is removed", async () => {
    const oldSecret = "jwt-old-secret-after-window-tests-1234567890";
    const newSecret = "jwt-new-secret-after-window-tests-1234567890";

    const oldKeyApp = await buildJwtVerifierApp({
      JWT_SECRET: oldSecret,
      JWT_SECRET_KID: "k-old",
      JWT_ROTATION_MODE: "stable",
    });

    const oldToken = oldKeyApp.jwt.sign({
      sub: "user-after-window",
      email: "after-window@example.com",
      type: "access",
    });
    await oldKeyApp.close();

    const stableApp = await buildJwtVerifierApp({
      JWT_SECRET: newSecret,
      JWT_SECRET_KID: "k-new",
      JWT_ROTATION_MODE: "stable",
      JWT_SECRET_PREVIOUS: undefined,
      JWT_SECRET_PREVIOUS_KID: undefined,
      JWT_ROTATION_STARTED_AT: undefined,
      JWT_ROTATION_WINDOW_MINUTES: undefined,
    });

    const response = await stableApp.inject({
      method: "GET",
      url: "/verify",
      headers: {
        authorization: `Bearer ${oldToken}`,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ ok: false });
    await stableApp.close();
  });
});
