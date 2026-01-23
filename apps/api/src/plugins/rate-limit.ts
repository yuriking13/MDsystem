/**
 * Rate Limiting Plugin
 * Защита от brute-force атак на эндпоинты аутентификации
 */

import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitOptions {
  /** Максимум запросов в окне */
  max: number;
  /** Размер окна в миллисекундах */
  windowMs: number;
  /** Ключ для группировки (по умолчанию IP) */
  keyGenerator?: (req: FastifyRequest) => string;
  /** Сообщение при превышении лимита */
  message?: string;
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store (для production рекомендуется Redis)
const stores = new Map<string, Map<string, RateLimitStore>>();

function getStore(name: string): Map<string, RateLimitStore> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

// Периодическая очистка устаревших записей
setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, value] of store.entries()) {
      if (value.resetTime < now) {
        store.delete(key);
      }
    }
  }
}, 60000); // Очистка каждую минуту

/**
 * Создаёт rate limit middleware для конкретного эндпоинта
 */
export function createRateLimiter(name: string, options: RateLimitOptions) {
  const {
    max,
    windowMs,
    keyGenerator = (req) => req.ip || 'unknown',
    message = 'Too many requests, please try again later',
  } = options;

  const store = getStore(name);

  return async (req: FastifyRequest, reply: FastifyReply) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetTime < now) {
      // Новое окно
      store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      reply.header('X-RateLimit-Limit', max);
      reply.header('X-RateLimit-Remaining', max - 1);
      reply.header('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return;
    }

    entry.count++;

    const remaining = Math.max(0, max - entry.count);
    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      reply.header('Retry-After', retryAfter);
      return reply.code(429).send({
        error: 'TooManyRequests',
        message,
        retryAfter,
      });
    }
  };
}

/**
 * Предустановленные лимиты
 */
export const rateLimits = {
  /** Login: 5 попыток за 15 минут с одного IP */
  login: createRateLimiter('login', {
    max: 5,
    windowMs: 15 * 60 * 1000,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  }),

  /** Register: 3 регистрации за час с одного IP */
  register: createRateLimiter('register', {
    max: 3,
    windowMs: 60 * 60 * 1000,
    message: 'Too many registration attempts. Please try again later.',
  }),

  /** Password reset: 3 запроса за час */
  passwordReset: createRateLimiter('password-reset', {
    max: 3,
    windowMs: 60 * 60 * 1000,
    message: 'Too many password reset requests. Please try again later.',
  }),

  /** API общий: 1000 запросов в минуту */
  api: createRateLimiter('api', {
    max: 1000,
    windowMs: 60 * 1000,
    message: 'API rate limit exceeded. Please slow down.',
  }),
};

/**
 * Получение статистики rate limiting
 */
export function getRateLimitStats() {
  const stats: Record<string, { totalKeys: number; activeKeys: number }> = {};
  const now = Date.now();

  for (const [name, store] of stores.entries()) {
    let activeKeys = 0;
    for (const entry of store.values()) {
      if (entry.resetTime > now) {
        activeKeys++;
      }
    }
    stats[name] = {
      totalKeys: store.size,
      activeKeys,
    };
  }

  return stats;
}

/**
 * Очистка rate limit для конкретного ключа (для тестов или admin функций)
 */
export function clearRateLimit(name: string, key?: string) {
  const store = stores.get(name);
  if (!store) return false;

  if (key) {
    return store.delete(key);
  } else {
    store.clear();
    return true;
  }
}

export default fp(async (app: FastifyInstance) => {
  // Добавляем статистику в /api/perf-stats
  app.decorate('getRateLimitStats', getRateLimitStats);
});
