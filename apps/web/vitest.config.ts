import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const isVitest = process.env.VITEST === "true";

export default defineConfig({
  plugins: [
    react({
      babel: isVitest ? { plugins: ["istanbul"] } : undefined,
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    deps: {
      optimizer: {
        web: {
          enabled: false,
        },
      },
    },
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      include: [
        "src/components/ArticleCard.tsx",
        "src/components/ArticleAISidebar.tsx",
        "src/lib/logger.ts",
        "src/lib/exportWord.ts",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
      thresholds: {
        lines: 10,
        statements: 10,
        functions: 10,
        branches: 10,
      },
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
