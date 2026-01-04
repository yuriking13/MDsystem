import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // TipTap editor - большой модуль, выносим в отдельный чанк
          'editor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-link',
            '@tiptap/extension-underline',
            '@tiptap/extension-text-align',
            '@tiptap/extension-highlight',
          ],
          // React и роутер
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Увеличиваем лимит предупреждения
    chunkSizeWarningLimit: 600,
  },
});
