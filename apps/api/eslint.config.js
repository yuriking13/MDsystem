import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.eslint.json"],
      },
    },
    rules: {
      // TypeScript specific
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "warn",
      
      // General
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
      "prefer-const": "warn",
      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": "warn",
      
      // Отключаем для совместимости
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  {
    files: [
      "src/routes/admin/full.ts",
      "src/routes/articles/full.ts",
      "src/routes/documents/graph.ts",
      "src/routes/semantic-search.ts",
      "src/routes/semantic-clusters.ts",
      "src/routes/files.ts",
      "src/routes/ai-writing-assistant.ts",
      "src/worker/**/*.ts",
      "src/lib/pubmed.ts",
      "src/lib/doaj.ts",
      "src/lib/wiley.ts",
      "src/lib/article-extractor.ts",
    ],
    rules: {
      // Legacy modules are being decomposed incrementally.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "*.js"],
  }
);
