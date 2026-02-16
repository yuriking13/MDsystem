import { describe, it, expect, beforeEach } from "vitest";

// Тестируем in-memory rate limiter (без Redis)
describe("Rate Limiter - Memory fallback", () => {
  // Простая реализация для тестирования
  class MemoryRateLimiter {
    private store: Map<string, { count: number; resetTime: number }> =
      new Map();

    constructor(
      private maxRequests: number,
      private windowMs: number,
    ) {}

    check(key: string): {
      allowed: boolean;
      remaining: number;
      resetTime: number;
    } {
      const now = Date.now();
      const entry = this.store.get(key);

      if (!entry || now > entry.resetTime) {
        // Новое окно
        this.store.set(key, { count: 1, resetTime: now + this.windowMs });
        return {
          allowed: true,
          remaining: this.maxRequests - 1,
          resetTime: now + this.windowMs,
        };
      }

      if (entry.count >= this.maxRequests) {
        return { allowed: false, remaining: 0, resetTime: entry.resetTime };
      }

      entry.count++;
      return {
        allowed: true,
        remaining: this.maxRequests - entry.count,
        resetTime: entry.resetTime,
      };
    }

    reset(key: string): void {
      this.store.delete(key);
    }
  }

  let limiter: MemoryRateLimiter;

  beforeEach(() => {
    limiter = new MemoryRateLimiter(3, 1000); // 3 запроса за 1 секунду
  });

  it("should allow requests within limit", () => {
    const result1 = limiter.check("user1");
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = limiter.check("user1");
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = limiter.check("user1");
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it("should block requests over limit", () => {
    limiter.check("user1");
    limiter.check("user1");
    limiter.check("user1");

    const result = limiter.check("user1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should track different keys separately", () => {
    limiter.check("user1");
    limiter.check("user1");
    limiter.check("user1");

    // user1 is at limit
    expect(limiter.check("user1").allowed).toBe(false);

    // user2 should still be allowed
    expect(limiter.check("user2").allowed).toBe(true);
  });

  it("should reset after window expires", async () => {
    const shortLimiter = new MemoryRateLimiter(1, 50); // 1 запрос за 50ms

    shortLimiter.check("user1");
    expect(shortLimiter.check("user1").allowed).toBe(false);

    // Ждём окончания окна
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(shortLimiter.check("user1").allowed).toBe(true);
  });

  it("should allow manual reset", () => {
    limiter.check("user1");
    limiter.check("user1");
    limiter.check("user1");
    expect(limiter.check("user1").allowed).toBe(false);

    limiter.reset("user1");
    expect(limiter.check("user1").allowed).toBe(true);
  });
});

describe("Rate Limiter - Key generation", () => {
  function getClientKey(ip: string, route: string): string {
    return `ratelimit:${route}:${ip}`;
  }

  it("should generate consistent keys", () => {
    const key1 = getClientKey("192.168.1.1", "login");
    const key2 = getClientKey("192.168.1.1", "login");
    expect(key1).toBe(key2);
  });

  it("should differentiate by IP", () => {
    const key1 = getClientKey("192.168.1.1", "login");
    const key2 = getClientKey("192.168.1.2", "login");
    expect(key1).not.toBe(key2);
  });

  it("should differentiate by route", () => {
    const key1 = getClientKey("192.168.1.1", "login");
    const key2 = getClientKey("192.168.1.1", "register");
    expect(key1).not.toBe(key2);
  });

  it("should handle IPv6 addresses", () => {
    const key = getClientKey("::1", "login");
    expect(key).toBe("ratelimit:login:::1");
  });
});
