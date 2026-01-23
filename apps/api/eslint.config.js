import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
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
    ignores: ["dist/**", "node_modules/**", "*.js"],
  }
);
