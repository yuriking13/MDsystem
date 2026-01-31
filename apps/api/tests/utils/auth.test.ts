import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Тестируем вспомогательные функции из auth.ts
// (Без подключения к БД - unit тесты)

describe("Auth Utils", () => {
  describe("generateSecureToken", () => {
    function generateSecureToken(): string {
      return crypto.randomBytes(32).toString("hex");
    }

    it("should generate a 64-character hex string", () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it("should generate unique tokens", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("hashToken", () => {
    function hashToken(token: string): string {
      return crypto.createHash("sha256").update(token).digest("hex");
    }

    it("should produce consistent hash for same input", () => {
      const token = "test-token-123";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it("should produce 64-character hex hash", () => {
      const hash = hashToken("any-token");
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = hashToken("token1");
      const hash2 = hashToken("token2");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("parseExpiration", () => {
    function parseExpiration(exp: string): number {
      const match = exp.match(/^(\d+)([smhd])$/);
      if (!match) {
        throw new Error(`Invalid expiration format: ${exp}`);
      }

      const value = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case "s":
          return value * 1000;
        case "m":
          return value * 60 * 1000;
        case "h":
          return value * 60 * 60 * 1000;
        case "d":
          return value * 24 * 60 * 60 * 1000;
        default:
          throw new Error(`Unknown time unit: ${unit}`);
      }
    }

    it("should parse seconds", () => {
      expect(parseExpiration("30s")).toBe(30 * 1000);
    });

    it("should parse minutes", () => {
      expect(parseExpiration("15m")).toBe(15 * 60 * 1000);
    });

    it("should parse hours", () => {
      expect(parseExpiration("2h")).toBe(2 * 60 * 60 * 1000);
    });

    it("should parse days", () => {
      expect(parseExpiration("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("should throw on invalid format", () => {
      expect(() => parseExpiration("invalid")).toThrow(
        "Invalid expiration format",
      );
      expect(() => parseExpiration("10w")).toThrow("Invalid expiration format");
      expect(() => parseExpiration("")).toThrow("Invalid expiration format");
    });
  });
});
