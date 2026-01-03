import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';

import { env } from './env.js';
import authPlugin from './auth.js';

import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/user.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true
});
await app.register(sensible);
await app.register(authPlugin);

await authRoutes(app);
await userRoutes(app);

app.get('/api/health', async () => ({ ok: true }));

app.listen({ host: env.HOST, port: env.PORT })
  .then(() => {
    app.log.info(`API listening on http://${env.HOST}:${env.PORT}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
