import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../..");

const testDatabaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://test:test@127.0.0.1:5432/mdsystem_test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 90_000,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "pnpm --filter api exec prisma generate && pnpm --filter api exec prisma db push --skip-generate && pnpm --filter api exec tsx src/bootstrap.ts",
      cwd: workspaceRoot,
      url: "http://127.0.0.1:3000/api/health/live",
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        NODE_ENV: "test",
        HOST: "127.0.0.1",
        PORT: "3000",
        DATABASE_URL: testDatabaseUrl,
        JWT_SECRET:
          process.env.JWT_SECRET ||
          "playwright-jwt-secret-abcdefghijklmnopqrstuvwxyz",
        JWT_ROTATION_MODE: process.env.JWT_ROTATION_MODE || "stable",
        API_KEY_ENCRYPTION_SECRET:
          process.env.API_KEY_ENCRYPTION_SECRET ||
          "playwright-api-key-encryption-secret-0123456789",
        CORS_ORIGIN: "http://127.0.0.1:4173",
        CROSSREF_MAILTO:
          process.env.CROSSREF_MAILTO || "playwright@example.com",
        RATE_LIMIT_LOGIN_MAX: process.env.RATE_LIMIT_LOGIN_MAX || "100",
        RATE_LIMIT_REGISTER_MAX: process.env.RATE_LIMIT_REGISTER_MAX || "100",
        OTEL_ENABLED: "false",
        SENTRY_DSN: "",
      },
    },
    {
      command: "pnpm --filter web exec vite --host 127.0.0.1 --port 4173",
      cwd: workspaceRoot,
      url: "http://127.0.0.1:4173/login",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        VITE_SENTRY_ENABLED: "false",
      },
    },
  ],
});
