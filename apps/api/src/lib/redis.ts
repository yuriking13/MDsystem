/**
 * Caching module for API data
 * Provides caching with automatic invalidation for articles, documents, files, statistics, and citation graphs
 *
 * Supports two backends:
 * 1. Redis (recommended for production) - if REDIS_URL is configured
 * 2. In-memory LRU cache (fallback) - if Redis is not available
 *
 * The fallback is automatic - no code changes needed in routes.
 */

import { Redis } from "ioredis";
import { LRUCache } from "lru-cache";
import { env } from "../env.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("cache");

// ============================================================
// In-memory LRU Cache (fallback when Redis is not available)
// ============================================================

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

// Default: 100MB max, 10000 entries max
const memoryCache = new LRUCache<string, MemoryCacheEntry>({
  max: 10000, // Maximum 10k entries
  maxSize: 100 * 1024 * 1024, // 100MB max
  sizeCalculation: (entry) => {
    // Size in bytes (roughly)
    return entry.value.length * 2 + 50; // UTF-16 + overhead
  },
  ttl: 0, // We manage TTL ourselves for consistency with Redis
  allowStale: false,
});

// Track memory cache stats
let memoryCacheHits = 0;
let memoryCacheMisses = 0;

/**
 * Get value from memory cache
 */
function memoryGet(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) {
    memoryCacheMisses++;
    return null;
  }

  // Check if expired
  if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    memoryCacheMisses++;
    return null;
  }

  memoryCacheHits++;
  return entry.value;
}

/**
 * Set value in memory cache with TTL
 */
function memorySet(key: string, value: string, ttlSeconds: number): void {
  const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
  memoryCache.set(key, { value, expiresAt });
}

/**
 * Delete key from memory cache
 */
function memoryDel(key: string): void {
  memoryCache.delete(key);
}

/**
 * Delete keys matching a pattern from memory cache
 * Supports simple glob patterns with * at the end
 */
function memoryDelPattern(pattern: string): number {
  let deleted = 0;
  const prefix = pattern.replace(/\*$/, "");

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
      deleted++;
    }
  }

  return deleted;
}

/**
 * Get memory cache statistics
 */
export function getMemoryCacheStats() {
  return {
    size: memoryCache.size,
    calculatedSize: memoryCache.calculatedSize,
    hits: memoryCacheHits,
    misses: memoryCacheMisses,
    hitRate:
      memoryCacheHits + memoryCacheMisses > 0
        ? (
            (memoryCacheHits / (memoryCacheHits + memoryCacheMisses)) *
            100
          ).toFixed(1) + "%"
        : "N/A",
  };
}

// ============================================================
// Redis client (primary, if configured)
// ============================================================

// Redis client instance (lazy initialization)
let redisClient: Redis | null = null;
let connectionAttempted = false;
let useRedis = false; // Track if we should use Redis or fallback

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!env.REDIS_URL;
}

/**
 * Check if Redis is actually connected and working
 */
export function isRedisConnected(): boolean {
  return useRedis && redisClient !== null;
}

/**
 * Check if Redis is available (configured and connected)
 * Alias for isRedisConnected for rate-limit plugin
 */
export function isRedisAvailable(): boolean {
  return useRedis && redisClient !== null;
}

/**
 * Get Redis client synchronously (returns cached client or null)
 * Use this when you need the client without initialization
 */
export function getRedisClient(): Redis | null {
  if (!useRedis || !redisClient) {
    return null;
  }
  return redisClient;
}

/**
 * Get cache backend info
 */
export function getCacheBackend(): {
  type: "redis" | "memory";
  connected: boolean;
  stats?: Record<string, unknown>;
} {
  if (useRedis && redisClient) {
    return { type: "redis", connected: true };
  }
  return {
    type: "memory",
    connected: true,
    stats: getMemoryCacheStats() as Record<string, unknown>,
  };
}

/**
 * Get or create Redis client asynchronously
 * Returns null if Redis is not configured or connection fails
 */
export async function initRedisClient(): Promise<Redis | null> {
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
          log.warn("Max retry attempts reached, falling back to memory cache");
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
      log.error("Redis connection error", err);
    });

    client.on("reconnecting", () => {
      log.info("Redis reconnecting...");
    });

    redisClient = client;
    useRedis = true;
    log.info("Using Redis backend");
    return client;
  } catch (err) {
    log.warn(
      "Redis connection failed, using in-memory LRU cache"(err as Error)
        .message,
    );
    useRedis = false;
    return null;
  }
}

/**
 * Cache key prefixes for different data types
 */
export const CACHE_KEYS = {
  // Project-specific caches
  articles: (projectId: string) => `proj:${projectId}:articles`,
  articlesStatus: (projectId: string, status: string) =>
    `proj:${projectId}:articles:${status}`,
  article: (projectId: string, articleId: string) =>
    `proj:${projectId}:article:${articleId}`,

  documents: (projectId: string) => `proj:${projectId}:docs`,
  document: (projectId: string, docId: string) =>
    `proj:${projectId}:doc:${docId}`,

  files: (projectId: string) => `proj:${projectId}:files`,
  file: (projectId: string, fileId: string) =>
    `proj:${projectId}:file:${fileId}`,

  statistics: (projectId: string) => `proj:${projectId}:stats`,
  statistic: (projectId: string, statId: string) =>
    `proj:${projectId}:stat:${statId}`,

  citationGraph: (projectId: string, options: string) =>
    `proj:${projectId}:graph:${options}`,

  // Project metadata
  project: (projectId: string) => `proj:${projectId}:meta`,
  bibliography: (projectId: string) => `proj:${projectId}:bib`,

  // External API caches (longer TTL since data rarely changes)
  crossref: (doi: string) => `ext:crossref:${encodeURIComponent(doi)}`,
  pubmed: (pmid: string) => `ext:pubmed:${pmid}`,
  pubmedSearch: (queryHash: string) => `ext:pubmed:search:${queryHash}`,
  unpaywall: (doi: string) => `ext:unpaywall:${encodeURIComponent(doi)}`,
  doaj: (query: string) => `ext:doaj:${query}`,
};

/**
 * Default TTL values (in seconds)
 */
const DEFAULT_TTL = env.REDIS_CACHE_TTL || 300; // 5 minutes
const SHORT_TTL = 60; // 1 minute for frequently changing data
const LONG_TTL = 600; // 10 minutes for rarely changing data
const EXTERNAL_API_TTL = 86400; // 24 hours for external API data (DOIs don't change)

/**
 * Get cached data
 * Uses Redis if available, otherwise falls back to memory cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  // Try Redis first
  const client = await initRedisClient();

  if (client && useRedis) {
    try {
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      log.warn("Redis get error, trying memory"(err as Error).message);
    }
  }

  // Fallback to memory cache
  try {
    const data = memoryGet(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    log.warn("Memory get error", { error: (err as Error).message });
    return null;
  }
}

/**
 * Set cached data with TTL
 * Uses Redis if available, otherwise falls back to memory cache
 */
export async function cacheSet(
  key: string,
  data: unknown,
  ttl = DEFAULT_TTL,
): Promise<boolean> {
  const jsonData = JSON.stringify(data);

  // Try Redis first
  const client = await initRedisClient();

  if (client && useRedis) {
    try {
      await client.setex(key, ttl, jsonData);
      return true;
    } catch (err) {
      log.warn("Redis set error, using memory"(err as Error).message);
    }
  }

  // Fallback to memory cache
  try {
    memorySet(key, jsonData, ttl);
    return true;
  } catch (err) {
    log.warn("Memory set error", { error: (err as Error).message });
    return false;
  }
}

/**
 * Delete cached data by key
 * Deletes from both Redis and memory cache for consistency
 */
export async function cacheDel(key: string): Promise<boolean> {
  let success = true;

  // Delete from Redis if available
  const client = await initRedisClient();
  if (client && useRedis) {
    try {
      await client.del(key);
    } catch (err) {
      log.warn("Redis delete error", { error: (err as Error).message });
      success = false;
    }
  }

  // Always delete from memory cache too
  try {
    memoryDel(key);
  } catch (err) {
    log.warn("Memory delete error", { error: (err as Error).message });
    success = false;
  }

  return success;
}

/**
 * Delete all cached data matching a pattern
 * Uses SCAN for Redis (doesn't block), simple iteration for memory
 */
export async function cacheDelPattern(pattern: string): Promise<boolean> {
  let success = true;

  // Delete from Redis if available
  const client = await initRedisClient();
  if (client && useRedis) {
    try {
      let cursor = "0";
      const keysToDelete: string[] = [];

      do {
        const [newCursor, keys] = await client.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );
        cursor = newCursor;
        keysToDelete.push(...keys);
      } while (cursor !== "0");

      if (keysToDelete.length > 0) {
        await client.del(...keysToDelete);
        log.debug(
          `Redis: deleted ${keysToDelete.length} keys matching: ${pattern}`,
        );
      }
    } catch (err) {
      log.warn("Redis delete pattern error"(err as Error).message);
      success = false;
    }
  }

  // Always delete from memory cache too
  try {
    const deleted = memoryDelPattern(pattern);
    if (deleted > 0) {
      log.debug(`Memory: deleted ${deleted} keys matching: ${pattern}`);
    }
  } catch (err) {
    log.warn("Memory delete pattern error"(err as Error).message);
    success = false;
  }

  return success;
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
export async function invalidateArticle(
  projectId: string,
  articleId: string,
): Promise<void> {
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
export async function invalidateDocument(
  projectId: string,
  docId: string,
): Promise<void> {
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
export async function invalidateFile(
  projectId: string,
  fileId: string,
): Promise<void> {
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
export async function invalidateStatistic(
  projectId: string,
  statId: string,
): Promise<void> {
  await cacheDel(CACHE_KEYS.statistic(projectId, statId));
  await cacheDel(CACHE_KEYS.statistics(projectId));
}

/**
 * Invalidate citation graph cache
 */
export async function invalidateCitationGraph(
  projectId: string,
): Promise<void> {
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
  ttl = DEFAULT_TTL,
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
  EXTERNAL_API: EXTERNAL_API_TTL,
};

/**
 * Gracefully close Redis connection and clear memory cache (call on server shutdown)
 */
export async function closeCache(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    connectionAttempted = false;
    useRedis = false;
    log.info("Redis connection closed");
  }

  // Clear memory cache
  memoryCache.clear();
  memoryCacheHits = 0;
  memoryCacheMisses = 0;
  log.info("Memory cache cleared");
}

// Alias for backwards compatibility
export const closeRedis = closeCache;

/**
 * Initialize cache backend
 * Call this on server startup to eagerly connect to Redis
 */
export async function initCache(): Promise<void> {
  const client = await initRedisClient();
  if (client) {
    log.info("Initialized with Redis backend");
  } else {
    log.info("Initialized with in-memory LRU backend (Redis not available)");
  }
}

// ============================================================
// DOI Validation
// ============================================================

/**
 * Validate DOI format according to DOI handbook
 * DOI format: 10.prefix/suffix
 * - prefix: at least 4 digits after 10.
 * - suffix: can contain alphanumeric, -, ., _, :, ;, /, (, ), <, >
 */
const DOI_REGEX = /^10\.\d{4,}(?:\.\d+)*\/[^\s]+$/;

export function isValidDOI(doi: string | null | undefined): boolean {
  if (!doi || typeof doi !== "string") return false;
  const cleaned = doi.trim().toLowerCase();
  return DOI_REGEX.test(cleaned);
}

/**
 * Normalize DOI to standard format
 * Handles various input formats:
 * - https://doi.org/10.1234/example
 * - doi:10.1234/example
 * - 10.1234/example
 */
export function normalizeDOI(doi: string): string | null {
  if (!doi || typeof doi !== "string") return null;

  let cleaned = doi.trim();

  // Remove URL prefixes
  cleaned = cleaned
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/^https?:\/\/dx\.doi\.org\//i, "")
    .replace(/^doi:/i, "")
    .trim();

  // Validate
  if (!DOI_REGEX.test(cleaned)) {
    return null;
  }

  return cleaned;
}

// ============================================================
// Cached External API helpers
// ============================================================

/**
 * Get cached Crossref data or fetch fresh
 */
export async function getCachedCrossref<T>(
  doi: string,
  fetcher: () => Promise<T | null>,
): Promise<T | null> {
  const normalizedDoi = normalizeDOI(doi);
  if (!normalizedDoi) return null;

  const key = CACHE_KEYS.crossref(normalizedDoi);

  // Check cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh
  const data = await fetcher();
  if (data !== null) {
    // Cache for 24 hours (DOI metadata rarely changes)
    await cacheSet(key, data, EXTERNAL_API_TTL);
  }

  return data;
}

/**
 * Get cached PubMed article or fetch fresh
 */
export async function getCachedPubMed<T>(
  pmid: string,
  fetcher: () => Promise<T | null>,
): Promise<T | null> {
  const key = CACHE_KEYS.pubmed(pmid);

  // Check cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh
  const data = await fetcher();
  if (data !== null) {
    await cacheSet(key, data, EXTERNAL_API_TTL);
  }

  return data;
}

/**
 * Get cached PubMed search results or fetch fresh
 * Uses a hash of the query parameters as key
 */
export async function getCachedPubMedSearch<T>(
  queryHash: string,
  fetcher: () => Promise<T>,
  ttl = 3600, // 1 hour for search results (may change more often)
): Promise<T> {
  const key = CACHE_KEYS.pubmedSearch(queryHash);

  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  await cacheSet(key, data, ttl);

  return data;
}

/**
 * Simple hash function for query strings
 */
export function hashQuery(query: string): string {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
