/**
 * Redis caching module for API data
 * Provides caching with automatic invalidation for articles, documents, files, statistics, and citation graphs
 */

import { Redis } from "ioredis";
import { env } from "../env.js";

// Redis client instance (lazy initialization)
let redisClient: Redis | null = null;
let connectionAttempted = false;

/**
 * Check if Redis is configured and available
 */
export function isRedisConfigured(): boolean {
  return !!env.REDIS_URL;
}

/**
 * Get or create Redis client
 * Returns null if Redis is not configured or connection fails
 */
export async function getRedisClient(): Promise<Redis | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  if (connectionAttempted) {
    return null;
  }

  connectionAttempted = true;

  try {
    const client = new Redis(env.REDIS_URL!, {
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.warn("[Redis] Max retry attempts reached, giving up");
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    // Test connection
    await client.connect();
    await client.ping();

    client.on("error", (err: Error) => {
      console.error("[Redis] Connection error:", err.message);
    });

    client.on("reconnecting", () => {
      console.log("[Redis] Reconnecting...");
    });

    redisClient = client;
    console.log("[Redis] Connected successfully");
    return client;
  } catch (err) {
    console.warn("[Redis] Connection failed, caching disabled:", (err as Error).message);
    return null;
  }
}

/**
 * Cache key prefixes for different data types
 */
export const CACHE_KEYS = {
  // Project-specific caches
  articles: (projectId: string) => `proj:${projectId}:articles`,
  articlesStatus: (projectId: string, status: string) => `proj:${projectId}:articles:${status}`,
  article: (projectId: string, articleId: string) => `proj:${projectId}:article:${articleId}`,
  
  documents: (projectId: string) => `proj:${projectId}:docs`,
  document: (projectId: string, docId: string) => `proj:${projectId}:doc:${docId}`,
  
  files: (projectId: string) => `proj:${projectId}:files`,
  file: (projectId: string, fileId: string) => `proj:${projectId}:file:${fileId}`,
  
  statistics: (projectId: string) => `proj:${projectId}:stats`,
  statistic: (projectId: string, statId: string) => `proj:${projectId}:stat:${statId}`,
  
  citationGraph: (projectId: string, options: string) => `proj:${projectId}:graph:${options}`,
  
  // Project metadata
  project: (projectId: string) => `proj:${projectId}:meta`,
  bibliography: (projectId: string) => `proj:${projectId}:bib`,
};

/**
 * Default TTL values (in seconds)
 */
const DEFAULT_TTL = env.REDIS_CACHE_TTL || 300; // 5 minutes
const SHORT_TTL = 60; // 1 minute for frequently changing data
const LONG_TTL = 600; // 10 minutes for rarely changing data

/**
 * Get cached data
 * Returns null if cache miss or Redis unavailable
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    console.warn("[Redis] Cache get error:", (err as Error).message);
    return null;
  }
}

/**
 * Set cached data with TTL
 */
export async function cacheSet(key: string, data: unknown, ttl = DEFAULT_TTL): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    await client.setex(key, ttl, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn("[Redis] Cache set error:", (err as Error).message);
    return false;
  }
}

/**
 * Delete cached data by key
 */
export async function cacheDel(key: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (err) {
    console.warn("[Redis] Cache delete error:", (err as Error).message);
    return false;
  }
}

/**
 * Delete all cached data matching a pattern
 * Uses SCAN for safety (doesn't block Redis)
 */
export async function cacheDelPattern(pattern: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    let cursor = "0";
    const keysToDelete: string[] = [];

    do {
      const [newCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = newCursor;
      keysToDelete.push(...keys);
    } while (cursor !== "0");

    if (keysToDelete.length > 0) {
      await client.del(...keysToDelete);
      console.log(`[Redis] Deleted ${keysToDelete.length} keys matching: ${pattern}`);
    }
    return true;
  } catch (err) {
    console.warn("[Redis] Cache delete pattern error:", (err as Error).message);
    return false;
  }
}

// ============================================================
// Invalidation helpers - call these when data changes
// ============================================================

/**
 * Invalidate all article caches for a project
 */
export async function invalidateArticles(projectId: string): Promise<void> {
  await cacheDelPattern(`proj:${projectId}:article*`);
  await cacheDel(CACHE_KEYS.citationGraph(projectId, "*"));
  await cacheDelPattern(`proj:${projectId}:graph:*`);
  await cacheDel(CACHE_KEYS.bibliography(projectId));
}

/**
 * Invalidate a specific article and related caches
 */
export async function invalidateArticle(projectId: string, articleId: string): Promise<void> {
  await cacheDel(CACHE_KEYS.article(projectId, articleId));
  await cacheDel(CACHE_KEYS.articles(projectId));
  await cacheDelPattern(`proj:${projectId}:articles:*`);
  await cacheDelPattern(`proj:${projectId}:graph:*`);
  await cacheDel(CACHE_KEYS.bibliography(projectId));
}

/**
 * Invalidate all document caches for a project
 */
export async function invalidateDocuments(projectId: string): Promise<void> {
  await cacheDelPattern(`proj:${projectId}:doc*`);
  await cacheDel(CACHE_KEYS.bibliography(projectId));
}

/**
 * Invalidate a specific document
 */
export async function invalidateDocument(projectId: string, docId: string): Promise<void> {
  await cacheDel(CACHE_KEYS.document(projectId, docId));
  await cacheDel(CACHE_KEYS.documents(projectId));
  await cacheDel(CACHE_KEYS.bibliography(projectId));
}

/**
 * Invalidate all file caches for a project
 */
export async function invalidateFiles(projectId: string): Promise<void> {
  await cacheDelPattern(`proj:${projectId}:file*`);
}

/**
 * Invalidate a specific file
 */
export async function invalidateFile(projectId: string, fileId: string): Promise<void> {
  await cacheDel(CACHE_KEYS.file(projectId, fileId));
  await cacheDel(CACHE_KEYS.files(projectId));
}

/**
 * Invalidate all statistics caches for a project
 */
export async function invalidateStatistics(projectId: string): Promise<void> {
  await cacheDelPattern(`proj:${projectId}:stat*`);
}

/**
 * Invalidate a specific statistic
 */
export async function invalidateStatistic(projectId: string, statId: string): Promise<void> {
  await cacheDel(CACHE_KEYS.statistic(projectId, statId));
  await cacheDel(CACHE_KEYS.statistics(projectId));
}

/**
 * Invalidate citation graph cache
 */
export async function invalidateCitationGraph(projectId: string): Promise<void> {
  await cacheDelPattern(`proj:${projectId}:graph:*`);
}

/**
 * Invalidate all caches for a project
 */
export async function invalidateProject(projectId: string): Promise<void> {
  await cacheDelPattern(`proj:${projectId}:*`);
}

// ============================================================
// Cache-through helpers for common operations
// ============================================================

/**
 * Get or fetch data with caching
 * If cache hit, return cached data
 * If cache miss, call fetcher, cache result, and return
 */
export async function cacheThrough<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache it (don't await, fire and forget)
  cacheSet(key, data, ttl).catch(() => {});

  return data;
}

/**
 * Get TTL constants
 */
export const TTL = {
  DEFAULT: DEFAULT_TTL,
  SHORT: SHORT_TTL,
  LONG: LONG_TTL,
};

/**
 * Gracefully close Redis connection (call on server shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    connectionAttempted = false;
    console.log("[Redis] Connection closed");
  }
}
