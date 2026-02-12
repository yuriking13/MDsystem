/**
 * Rate Limiting Plugin с поддержкой Redis
 * Защита от brute-force атак на эндпоинты аутентификации
 *
 * Использует Redis если доступен, иначе fallback на in-memory store
 */

import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getRedisClient, isRedisAvailable } from "../lib/redis.js";

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

// In-memory store как fallback
const memoryStores = new Map<string, Map<string, RateLimitStore>>();

function getMemoryStore(name: string): Map<string, RateLimitStore> {
  if (!memoryStores.has(name)) {
    memoryStores.set(name, new Map());
  }
  return memoryStores.get(name)!;
}

/**
 * Non-blocking Redis key scan by pattern.
 */
async function scanRedisKeys(pattern: string): Promise<string[]> {
  const redis = getRedisClient();
  if (!redis) {
    return [];
  }

  let cursor = "0";
  const keys: string[] = [];

  do {
    const [nextCursor, batch] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      200,
    );
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== "0");

  return keys;
}

// Периодическая очистка устаревших записей в memory store
setInterval(() => {
  const now = Date.now();
  for (const store of memoryStores.values()) {
    for (const [key, value] of store.entries()) {
      if (value.resetTime < now) {
        store.delete(key);
      }
    }
  }
}, 60000); // Очистка каждую минуту

/**
 * Redis-based rate limiting
 */
async function checkRateLimitRedis(
  name: string,
  key: string,
  max: number,
  windowMs: number,
): Promise<{
  allowed: boolean;
  count: number;
  resetTime: number;
  remaining: number;
}> {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error("Redis not available");
  }

  const redisKey = `ratelimit:${name}:${key}`;
  const now = Date.now();

  // Используем Redis MULTI для атомарности
  const pipeline = redis.multi();
  pipeline.incr(redisKey);
  pipeline.pttl(redisKey);

  const results = await pipeline.exec();

  if (!results) {
    throw new Error("Redis pipeline failed");
  }

  const count = results[0][1] as number;
  let ttl = results[1][1] as number;

  // Если ключ новый (TTL = -1), устанавливаем expire
  if (ttl === -1) {
    await redis.pexpire(redisKey, windowMs);
    ttl = windowMs;
  }

  const resetTime = now + ttl;
  const remaining = Math.max(0, max - count);
  const allowed = count <= max;

  return { allowed, count, resetTime, remaining };
}

/**
 * Memory-based rate limiting (fallback)
 */
function checkRateLimitMemory(
  name: string,
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; count: number; resetTime: number; remaining: number } {
  const store = getMemoryStore(name);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetTime < now) {
    // Новое окно
    const resetTime = now + windowMs;
    store.set(key, { count: 1, resetTime });
    return { allowed: true, count: 1, resetTime, remaining: max - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, max - entry.count);
  const allowed = entry.count <= max;

  return { allowed, count: entry.count, resetTime: entry.resetTime, remaining };
}

/**
 * Создаёт rate limit middleware для конкретного эндпоинта
 */
export function createRateLimiter(name: string, options: RateLimitOptions) {
  const {
    max,
    windowMs,
    keyGenerator = (req) => req.ip || "unknown",
    message = "Too many requests, please try again later",
  } = options;

  return async (req: FastifyRequest, reply: FastifyReply) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let result: {
      allowed: boolean;
      count: number;
      resetTime: number;
      remaining: number;
    };

    try {
      // Пробуем Redis
      if (isRedisAvailable()) {
        result = await checkRateLimitRedis(name, key, max, windowMs);
      } else {
        result = checkRateLimitMemory(name, key, max, windowMs);
      }
    } catch {
      // Fallback на memory при ошибке Redis
      result = checkRateLimitMemory(name, key, max, windowMs);
    }

    // Устанавливаем заголовки
    reply.header("X-RateLimit-Limit", max);
    reply.header("X-RateLimit-Remaining", result.remaining);
    reply.header("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - now) / 1000);
      reply.header("Retry-After", retryAfter);
      return reply.code(429).send({
        error: "TooManyRequests",
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
  login: createRateLimiter("login", {
    max: 5,
    windowMs: 15 * 60 * 1000,
    message: "Too many login attempts. Please try again in 15 minutes.",
  }),

  /** Register: 3 регистрации за час с одного IP */
  register: createRateLimiter("register", {
    max: 3,
    windowMs: 60 * 60 * 1000,
    message: "Too many registration attempts. Please try again later.",
  }),

  /** Password reset: 3 запроса за час */
  passwordReset: createRateLimiter("password-reset", {
    max: 3,
    windowMs: 60 * 60 * 1000,
    message: "Too many password reset requests. Please try again later.",
  }),

  /** API общий: 1000 запросов в минуту */
  api: createRateLimiter("api", {
    max: 1000,
    windowMs: 60 * 1000,
    message: "API rate limit exceeded. Please slow down.",
  }),
};

/**
 * Получение статистики rate limiting
 */
export async function getRateLimitStats() {
  const stats: Record<
    string,
    { totalKeys: number; activeKeys: number; backend: string }
  > = {};
  const now = Date.now();

  // Memory stats
  for (const [name, store] of memoryStores.entries()) {
    let activeKeys = 0;
    for (const entry of store.values()) {
      if (entry.resetTime > now) {
        activeKeys++;
      }
    }
    stats[name] = {
      totalKeys: store.size,
      activeKeys,
      backend: "memory",
    };
  }

  // Redis stats (if available)
  if (isRedisAvailable()) {
    try {
      const redis = getRedisClient();
      if (redis) {
        const keys = await scanRedisKeys("ratelimit:*");
        const grouped: Record<string, number> = {};

        for (const key of keys) {
          const name = key.split(":")[1];
          grouped[name] = (grouped[name] || 0) + 1;
        }

        for (const [name, count] of Object.entries(grouped)) {
          stats[`redis:${name}`] = {
            totalKeys: count,
            activeKeys: count, // All Redis keys are active (have TTL)
            backend: "redis",
          };
        }
      }
    } catch {
      // Ignore Redis errors for stats
    }
  }

  return stats;
}

/**
 * Очистка rate limit для конкретного ключа (для тестов или admin функций)
 */
export async function clearRateLimit(
  name: string,
  key?: string,
): Promise<boolean> {
  // Clear from memory
  const store = memoryStores.get(name);
  if (store) {
    if (key) {
      store.delete(key);
    } else {
      store.clear();
    }
  }

  // Clear from Redis
  if (isRedisAvailable()) {
    try {
      const redis = getRedisClient();
      if (redis) {
        if (key) {
          await redis.del(`ratelimit:${name}:${key}`);
        } else {
          const keys = await scanRedisKeys(`ratelimit:${name}:*`);
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        }
      }
    } catch {
      // Ignore Redis errors
    }
  }

  return true;
}

export default fp(async (app: FastifyInstance) => {
  // Добавляем статистику в /api/perf-stats
  app.decorate("getRateLimitStats", getRateLimitStats);
});
