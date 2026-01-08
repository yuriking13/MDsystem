import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';

import { env } from './env.js';
import authPlugin from './auth.js';

import { authRoutes } from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import projectsRoutes from './routes/projects.js';
import articlesRoutes from './routes/articles.js';
import documentsRoutes from './routes/documents.js';
import statisticsRoutes from './routes/statistics.js';

import envGuard from './plugins/00-env-guard.js';
import { startWorkers } from './worker/index.js';
import { registerWebSocket, getConnectionStats } from './websocket.js';

const app = Fastify({ logger: true });

await app.register(envGuard);

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true
});
await app.register(sensible);
await app.register(authPlugin);

// WebSocket для real-time синхронизации
await registerWebSocket(app);

await authRoutes(app);
await app.register(settingsRoutes, { prefix: '/api' });
await app.register(projectsRoutes, { prefix: '/api' });
await app.register(articlesRoutes, { prefix: '/api' });
await app.register(documentsRoutes, { prefix: '/api' });
await app.register(statisticsRoutes, { prefix: '/api' });

app.get('/api/health', async () => ({ ok: true }));

// Статистика WebSocket подключений
app.get('/api/ws-stats', async () => getConnectionStats());

app.listen({ host: env.HOST, port: env.PORT })
  .then(() => {
    app.log.info(`API listening on http://${env.HOST}:${env.PORT}`);

    // Стартуем фоновые воркеры (pg-boss) для очередей
    startWorkers().catch((err) => {
      app.log.error({ err }, 'Failed to start workers');
    });
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
