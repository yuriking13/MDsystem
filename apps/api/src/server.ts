import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';

import { env } from './env.js';
import authPlugin from './auth.js';
import { setupErrorHandler, setupNotFoundHandler } from './utils/errors.js';

import { authRoutes } from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import projectsRoutes from './routes/projects.js';
import articlesRoutes from './routes/articles.js';
import documentsRoutes from './routes/documents.js';
import statisticsRoutes from './routes/statistics.js';
import filesRoutes from './routes/files.js';
import { adminRoutes } from './routes/admin.js';
import { healthRoutes } from './routes/health.js';

import envGuard from './plugins/00-env-guard.js';
import swaggerPlugin from './plugins/swagger.js';
import metricsPlugin from './plugins/metrics.js';
import { startWorkers, stopWorkers } from './worker/index.js';
import { registerWebSocket, getConnectionStats } from './websocket.js';
import { initCache, getCacheBackend, closeCache } from './lib/redis.js';
import { getRateLimitStats } from './plugins/rate-limit.js';

// Request timeout (30 секунд по умолчанию)
const REQUEST_TIMEOUT_MS = 30_000;

const app = Fastify({ 
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Добавляем request ID в логи
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket?.remotePort,
        };
      },
    },
  },
  // Генерация request ID для трассировки
  genReqId: () => `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
  // Request timeout
  requestTimeout: REQUEST_TIMEOUT_MS,
});

// Централизованная обработка ошибок
setupErrorHandler(app);
setupNotFoundHandler(app);

await app.register(envGuard);

// OpenAPI/Swagger documentation
await app.register(swaggerPlugin);

// Prometheus metrics
await app.register(metricsPlugin);

// HTTP Compression (gzip, brotli)
await app.register(compress, {
  global: true,
  encodings: ['gzip', 'deflate'],
  threshold: 1024, // Сжимать ответы больше 1KB
});

// Security headers (Helmet)
await app.register(helmet, {
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false, // Отключаем CSP в dev для удобства
  crossOriginEmbedderPolicy: false, // Для совместимости с S3 файлами
});

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true
});
await app.register(sensible);
await app.register(multipart, {
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});
await app.register(authPlugin);

// WebSocket для real-time синхронизации
await registerWebSocket(app);

await authRoutes(app);
await adminRoutes(app);
await app.register(settingsRoutes, { prefix: '/api' });
await app.register(projectsRoutes, { prefix: '/api' });
await app.register(articlesRoutes, { prefix: '/api' });
await app.register(documentsRoutes, { prefix: '/api' });
await app.register(statisticsRoutes, { prefix: '/api' });
await app.register(filesRoutes, { prefix: '/api' });

// Health check endpoints (улучшенная версия с circuit breaker stats)
await healthRoutes(app);

// Статистика WebSocket подключений
app.get('/api/ws-stats', async () => getConnectionStats());

// Статистика кэша
app.get('/api/cache-stats', async () => getCacheBackend());

// Статистика производительности (pool, кэши)
app.get('/api/perf-stats', async () => {
  const { getPoolStats } = await import('./pg.js');
  const { getAccessCacheStats } = await import('./utils/project-access.js');
  const { getHttpClientStats } = await import('./lib/http-client.js');
  
  return {
    pool: getPoolStats(),
    accessCache: getAccessCacheStats(),
    cache: getCacheBackend(),
    rateLimit: getRateLimitStats(),
    httpClient: getHttpClientStats(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
    },
    uptime: Math.round(process.uptime()) + ' sec',
  };
});

// Initialize cache on startup
await initCache();

// Graceful shutdown
const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Received shutdown signal, gracefully stopping...');
  
  // 1. Останавливаем воркеры (завершают текущие задачи)
  try {
    await stopWorkers();
    app.log.info('Workers stopped');
  } catch (err) {
    app.log.error({ err }, 'Error stopping workers');
  }
  
  // 2. Закрываем кэш
  try {
    await closeCache();
    app.log.info('Cache closed');
  } catch (err) {
    app.log.error({ err }, 'Error closing cache');
  }
  
  // 3. Закрываем сервер (завершает активные соединения)
  try {
    await app.close();
    app.log.info('Server closed');
  } catch (err) {
    app.log.error({ err }, 'Error closing server');
  }
  
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

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
