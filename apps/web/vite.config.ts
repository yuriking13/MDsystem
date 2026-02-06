import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core - загружается всегда, кешируется надолго
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // TipTap editor - загружается только на странице документа
          "vendor-tiptap": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-placeholder",
            "@tiptap/extension-link",
            "@tiptap/extension-underline",
            "@tiptap/extension-text-align",
            "@tiptap/extension-highlight",
            "@tiptap/extension-image",
            "@tiptap/extension-table",
            "@tiptap/extension-table-cell",
            "@tiptap/extension-table-header",
            "@tiptap/extension-table-row",
            "@tiptap/extension-color",
            "@tiptap/extension-text-style",
            "@tiptap/extension-font-family",
          ],

          // Chart.js - загружается только при работе со статистикой/графиками
          "vendor-charts": [
            "chart.js",
            "react-chartjs-2",
            "@sgratzl/chartjs-chart-boxplot",
          ],

          // Граф цитирований - тяжёлая библиотека, отдельный чанк
          "vendor-graph": ["react-force-graph-2d"],

          // Word/PDF экспорт - загружается только при экспорте
          "vendor-export": ["docx", "file-saver"],

          // Flowbite UI - используется минимально
          "vendor-flowbite": ["flowbite", "flowbite-react"],

          // Утилиты
          "vendor-utils": [
            "date-fns",
            "zod",
            "clsx",
            "tailwind-merge",
            "class-variance-authority",
            "lodash-es",
          ],

          // React Hook Form
          "vendor-forms": ["react-hook-form"],
        },
      },
    },
    // Уменьшаем лимит предупреждения для лучшего контроля
    chunkSizeWarningLimit: 300,
    // Включаем сжатие CSS
    cssMinify: true,
    // Настройки для лучшей совместимости и размера
    target: "es2020",
    // Source maps только для production debugging
    sourcemap: false,
  },
});
