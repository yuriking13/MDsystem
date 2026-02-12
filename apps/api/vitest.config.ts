import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/auth.ts",
        "src/routes/auth.ts",
        "src/routes/projects.ts",
        "src/routes/statistics.ts",
        "src/routes/health.ts",
        "src/websocket.ts",
        "src/utils/project-access.ts",
      ],
      exclude: ["src/**/*.test.ts", "src/types/**", "src/**/*.d.ts"],
      thresholds: {
        lines: 20,
        statements: 20,
        functions: 20,
        branches: 15,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
