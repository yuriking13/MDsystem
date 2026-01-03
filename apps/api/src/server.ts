import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';

import { env } from './env.js';
import authPlugin from './auth.js';

import { authRoutes } from './routes/auth.js';
import { projectRoutes } from './routes/projects.js';
import { searchRoutes } from './routes/search.js';
import { articleRoutes } from './routes/articles.js';

import { startWorkers } from './worker/index.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true
});
await app.register(sensible);
await app.register(authPlugin);

await authRoutes(app);
await projectRoutes(app);
await searchRoutes(app);
await articleRoutes(app);

app.get('/api/health', async () => ({ ok: true }));

app.listen({ host: env.HOST, port: env.PORT })
  .then(async () => {
    app.log.info(`API listening on http://${env.HOST}:${env.PORT}`);
    // In MVP запускаем воркеры в том же процессе. Потом можно вынести в отдельный процесс/сервис.
    await startWorkers();
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
