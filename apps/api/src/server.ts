import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';

import { env } from './env.js';
import authPlugin from './auth.js';

import { authRoutes } from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import projectsRoutes from './routes/projects.js';

import envGuard from './plugins/00-env-guard.js';

const app = Fastify({ logger: true });

await app.register(envGuard);

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true
});
await app.register(sensible);
await app.register(authPlugin);

await authRoutes(app);
await app.register(settingsRoutes, { prefix: '/api' });
await app.register(projectsRoutes, { prefix: '/api' });

app.get('/api/health', async () => ({ ok: true }));

app.listen({ host: env.HOST, port: env.PORT })
  .then(() => {
    app.log.info(`API listening on http://${env.HOST}:${env.PORT}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
