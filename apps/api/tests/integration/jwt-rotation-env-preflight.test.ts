import { afterEach, describe, expect, it, vi } from "vitest";

const BASE_ENV: Record<string, string> = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: "3001",
  DATABASE_URL: "postgresql://test:test@localhost:5432/mdsystem_test",
  JWT_SECRET: "jwt-env-preflight-secret-current-1234567890",
  JWT_SECRET_KID: "k-current",
  API_KEY_ENCRYPTION_SECRET: "api-key-secret-for-env-preflight-tests-12345",
  CORS_ORIGIN: "http://localhost:5173",
  CROSSREF_MAILTO: "test@example.com",
};

async function importEnvWith(
  overrides: Record<string, string | undefined>,
): Promise<unknown> {
  for (const [key, value] of Object.entries(BASE_ENV)) {
    process.env[key] = value;
  }

  const resetKeys = [
    "JWT_SECRET_PREVIOUS",
    "JWT_SECRET_PREVIOUS_KID",
    "JWT_ROTATION_MODE",
    "JWT_ROTATION_STARTED_AT",
    "JWT_ROTATION_WINDOW_MINUTES",
  ];
  for (const key of resetKeys) {
    delete process.env[key];
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }

  vi.resetModules();
  return import("../../src/env.js");
}

describe("JWT rotation preflight env validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails when previous key is set in stable mode", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      importEnvWith({
        JWT_ROTATION_MODE: "stable",
        JWT_SECRET_PREVIOUS: "jwt-env-preflight-secret-previous-1234567890",
        JWT_SECRET_PREVIOUS_KID: "k-previous",
      }),
    ).rejects.toThrow("Invalid environment variables");
  });

  it("fails when rotation mode misses metadata", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      importEnvWith({
        JWT_ROTATION_MODE: "rotation",
        JWT_SECRET_PREVIOUS: "jwt-env-preflight-secret-previous-1234567890",
        JWT_SECRET_PREVIOUS_KID: "k-previous",
      }),
    ).rejects.toThrow("Invalid environment variables");
  });

  it("accepts valid rotation-mode configuration", async () => {
    const envModule = (await importEnvWith({
      JWT_ROTATION_MODE: "rotation",
      JWT_SECRET_PREVIOUS: "jwt-env-preflight-secret-previous-1234567890",
      JWT_SECRET_PREVIOUS_KID: "k-previous",
      JWT_ROTATION_STARTED_AT: new Date().toISOString(),
      JWT_ROTATION_WINDOW_MINUTES: "60",
    })) as {
      env: { JWT_ROTATION_MODE: string; JWT_SECRET_PREVIOUS?: string };
    };

    expect(envModule.env.JWT_ROTATION_MODE).toBe("rotation");
    expect(envModule.env.JWT_SECRET_PREVIOUS).toBe(
      "jwt-env-preflight-secret-previous-1234567890",
    );
  });
});
