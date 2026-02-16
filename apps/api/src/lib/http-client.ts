/**
 * HTTP Client with retry, rate limiting, and circuit breaker
 * Provides robust HTTP calls for external APIs
 */

import { createLogger } from "../utils/logger.js";

const log = createLogger("http-client");

// ============================================================
// Rate Limiter - Token Bucket Algorithm
// ============================================================

interface RateLimiterConfig {
  tokensPerSecond: number;
  maxTokens: number;
}

class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly tokensPerSecond: number;
  private readonly maxTokens: number;

  constructor(config: RateLimiterConfig) {
    this.tokensPerSecond = config.tokensPerSecond;
    this.maxTokens = config.maxTokens;
    this.tokens = config.maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.tokensPerSecond,
    );
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait until we have a token
    const waitTime = ((1 - this.tokens) / this.tokensPerSecond) * 1000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    this.tokens = 0;
    this.lastRefill = Date.now();
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

// Rate limiters for external APIs
const rateLimiters = new Map<string, TokenBucketRateLimiter>();

// API-specific rate limits
// PubMed: 3 req/sec without API key, 10 req/sec with API key
const NCBI_API_KEY = process.env.NCBI_API_KEY;
const API_RATE_LIMITS: Record<string, RateLimiterConfig> = {
  pubmed: { tokensPerSecond: NCBI_API_KEY ? 10 : 3, maxTokens: 10 },
  crossref: { tokensPerSecond: 50, maxTokens: 50 }, // Crossref is generous
  doaj: { tokensPerSecond: 10, maxTokens: 20 },
  openrouter: { tokensPerSecond: 10, maxTokens: 20 },
  unpaywall: { tokensPerSecond: 10, maxTokens: 10 },
};

function getRateLimiter(apiName: string): TokenBucketRateLimiter {
  const existingLimiter = rateLimiters.get(apiName);
  if (existingLimiter) {
    return existingLimiter;
  }

  const config = API_RATE_LIMITS[apiName] || {
    tokensPerSecond: 5,
    maxTokens: 10,
  };
  const limiter = new TokenBucketRateLimiter(config);
  rateLimiters.set(apiName, limiter);
  return limiter;
}

// ============================================================
// Circuit Breaker
// ============================================================

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenRequests: 2,
};

function getCircuitBreaker(apiName: string): CircuitBreakerState {
  const existingBreaker = circuitBreakers.get(apiName);
  if (existingBreaker) {
    return existingBreaker;
  }

  const breaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    state: "closed",
  };
  circuitBreakers.set(apiName, breaker);
  return breaker;
}

function recordSuccess(apiName: string): void {
  const cb = getCircuitBreaker(apiName);
  cb.failures = 0;
  cb.state = "closed";
}

function recordFailure(apiName: string): void {
  const cb = getCircuitBreaker(apiName);
  cb.failures++;
  cb.lastFailure = Date.now();

  if (cb.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    cb.state = "open";
    log.warn(
      `CircuitBreaker: ${apiName} circuit opened after ${cb.failures} failures`,
    );
  }
}

function canRequest(apiName: string): boolean {
  const cb = getCircuitBreaker(apiName);

  if (cb.state === "closed") return true;

  if (cb.state === "open") {
    const elapsed = Date.now() - cb.lastFailure;
    if (elapsed > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      cb.state = "half-open";
      log.info(`CircuitBreaker: ${apiName} circuit half-open, testing...`);
      return true;
    }
    return false;
  }

  // half-open - allow limited requests
  return true;
}

// ============================================================
// Retry with Exponential Backoff
// ============================================================

export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

function isRetryableError(
  error: Error | Response,
  config: Required<RetryConfig>,
): boolean {
  if (error instanceof Response) {
    return config.retryableStatuses.includes(error.status);
  }

  // Network errors are retryable
  const message = error.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("socket hang up")
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(
  attempt: number,
  config: Required<RetryConfig>,
): number {
  // Exponential backoff with jitter
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

// ============================================================
// Resilient Fetch - Main Export
// ============================================================

export interface ResilientFetchOptions extends RequestInit {
  apiName?: string;
  retry?: RetryConfig;
  skipRateLimit?: boolean;
  skipCircuitBreaker?: boolean;
  timeoutMs?: number;
}

export class CircuitBreakerOpenError extends Error {
  constructor(apiName: string) {
    super(`Circuit breaker open for ${apiName}`);
    this.name = "CircuitBreakerOpenError";
  }
}

/**
 * Resilient fetch with retry, rate limiting, and circuit breaker
 */
export async function resilientFetch(
  url: string,
  options: ResilientFetchOptions = {},
): Promise<Response> {
  const {
    apiName = "default",
    retry = {},
    skipRateLimit = false,
    skipCircuitBreaker = false,
    timeoutMs = 30000,
    ...fetchOptions
  } = options;

  const retryConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...retry,
  };

  // Check circuit breaker
  if (!skipCircuitBreaker && !canRequest(apiName)) {
    throw new CircuitBreakerOpenError(apiName);
  }

  // Apply rate limiting
  if (!skipRateLimit) {
    await getRateLimiter(apiName).acquire();
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is retryable
      if (!response.ok && isRetryableError(response, retryConfig)) {
        if (attempt < retryConfig.maxRetries) {
          const delay = calculateBackoff(attempt, retryConfig);
          log.info(
            `${apiName} ${response.status} - retry ${attempt + 1}/${retryConfig.maxRetries} in ${Math.round(delay)}ms`,
          );
          await sleep(delay);
          continue;
        }
      }

      // Success - reset circuit breaker
      if (response.ok) {
        recordSuccess(apiName);
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (
        isRetryableError(error as Error, retryConfig) &&
        attempt < retryConfig.maxRetries
      ) {
        const delay = calculateBackoff(attempt, retryConfig);
        log.info(
          `${apiName} error - retry ${attempt + 1}/${retryConfig.maxRetries} in ${Math.round(delay)}ms: ${(error as Error).message}`,
        );
        await sleep(delay);
        continue;
      }

      // Record failure for circuit breaker
      if (!skipCircuitBreaker) {
        recordFailure(apiName);
      }

      throw error;
    }
  }

  // All retries exhausted
  if (!skipCircuitBreaker) {
    recordFailure(apiName);
  }
  throw lastError || new Error(`All retries exhausted for ${url}`);
}

/**
 * Resilient fetch with JSON parsing
 */
export async function resilientFetchJson<T>(
  url: string,
  options: ResilientFetchOptions = {},
): Promise<T> {
  const response = await resilientFetch(url, options);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `HTTP ${response.status} for ${url}: ${text.slice(0, 300)}`,
    );
  }

  return response.json() as Promise<T>;
}

// ============================================================
// Stats and Monitoring
// ============================================================

export function getHttpClientStats() {
  const rateLimiterStats: Record<string, number> = {};
  for (const [name, limiter] of rateLimiters) {
    rateLimiterStats[name] = Math.floor(limiter.getAvailableTokens());
  }

  const circuitBreakerStats: Record<
    string,
    { state: string; failures: number }
  > = {};
  for (const [name, cb] of circuitBreakers) {
    circuitBreakerStats[name] = { state: cb.state, failures: cb.failures };
  }

  return {
    rateLimiters: rateLimiterStats,
    circuitBreakers: circuitBreakerStats,
  };
}

/**
 * Reset circuit breaker for an API (for testing/admin)
 */
export function resetCircuitBreaker(apiName: string): void {
  const cb = getCircuitBreaker(apiName);
  cb.failures = 0;
  cb.state = "closed";
  log.info(`CircuitBreaker: ${apiName} circuit manually reset`);
}
