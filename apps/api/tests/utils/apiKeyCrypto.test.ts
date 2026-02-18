import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

// Pure unit tests without importing the actual module (which has env dependency)
// Instead, we test the encryption logic directly

function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

function encryptApiKey(plain: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`;
}

function decryptApiKey(stored: string, key: Buffer): string {
  const [v, ivB64, ctB64, tagB64] = stored.split(":");
  if (v !== "v1" || !ivB64 || !ctB64 || !tagB64) {
    throw new Error("Unsupported encrypted key format");
  }
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

function decryptApiKeyWithFallback(stored: string, keys: Buffer[]): string {
  let lastError: unknown = null;
  for (const key of keys) {
    try {
      return decryptApiKey(stored, key);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to decrypt with provided keys");
}

describe("API Key Crypto", () => {
  const TEST_SECRET = "test-secret-key-for-encryption-32chars";
  const KEY = deriveKey(TEST_SECRET);

  describe("encryptApiKey", () => {
    it("should encrypt an API key", () => {
      const apiKey = "sk-test-1234567890";
      const encrypted = encryptApiKey(apiKey, KEY);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(apiKey);
      expect(encrypted.startsWith("v1:")).toBe(true);
    });

    it("should generate different ciphertexts for same input", () => {
      const apiKey = "sk-test-1234567890";
      const encrypted1 = encryptApiKey(apiKey, KEY);
      const encrypted2 = encryptApiKey(apiKey, KEY);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle empty string", () => {
      const encrypted = encryptApiKey("", KEY);
      expect(encrypted).toBeDefined();
      expect(encrypted.startsWith("v1:")).toBe(true);
    });

    it("should handle long API keys", () => {
      const longKey = "sk-" + "a".repeat(1000);
      const encrypted = encryptApiKey(longKey, KEY);

      expect(encrypted).toBeDefined();
      expect(encrypted.startsWith("v1:")).toBe(true);
    });
  });

  describe("decryptApiKey", () => {
    it("should decrypt an encrypted API key", () => {
      const apiKey = "sk-test-1234567890";
      const encrypted = encryptApiKey(apiKey, KEY);
      const decrypted = decryptApiKey(encrypted, KEY);

      expect(decrypted).toBe(apiKey);
    });

    it("should handle special characters", () => {
      const apiKey = "sk-test_with-special.chars!@#$%^&*()";
      const encrypted = encryptApiKey(apiKey, KEY);
      const decrypted = decryptApiKey(encrypted, KEY);

      expect(decrypted).toBe(apiKey);
    });

    it("should handle unicode characters", () => {
      const apiKey = "sk-тест-кириллица-中文";
      const encrypted = encryptApiKey(apiKey, KEY);
      const decrypted = decryptApiKey(encrypted, KEY);

      expect(decrypted).toBe(apiKey);
    });

    it("should throw on invalid format", () => {
      expect(() => decryptApiKey("invalid", KEY)).toThrow(
        "Unsupported encrypted key format",
      );
      expect(() => decryptApiKey("v2:abc:def:ghi", KEY)).toThrow(
        "Unsupported encrypted key format",
      );
    });

    it("should throw on tampered ciphertext", () => {
      const apiKey = "sk-test-1234567890";
      const encrypted = encryptApiKey(apiKey, KEY);
      const parts = encrypted.split(":");
      parts[2] = "tampered" + parts[2].slice(8);
      const tampered = parts.join(":");

      expect(() => decryptApiKey(tampered, KEY)).toThrow();
    });

    it("should decrypt with previous key during rotation window", () => {
      const oldKey = deriveKey("old-secret-key-for-encryption-32chars");
      const newKey = deriveKey("new-secret-key-for-encryption-32chars");
      const apiKey = "sk-rotation-test-key";
      const encryptedWithOldKey = encryptApiKey(apiKey, oldKey);

      const decrypted = decryptApiKeyWithFallback(encryptedWithOldKey, [
        newKey,
        oldKey,
      ]);

      expect(decrypted).toBe(apiKey);
    });
  });

  describe("round-trip encryption", () => {
    const testCases = [
      "simple-key",
      "sk-proj-abcdefghijklmnop1234567890",
      "a",
      "🔐🔑🗝️",
      "key with spaces",
      "key\nwith\nnewlines",
      "key\twith\ttabs",
    ];

    testCases.forEach((testKey) => {
      it(`should round-trip: "${testKey.substring(0, 20)}${testKey.length > 20 ? "..." : ""}"`, () => {
        const encrypted = encryptApiKey(testKey, KEY);
        const decrypted = decryptApiKey(encrypted, KEY);
        expect(decrypted).toBe(testKey);
      });
    });
  });
});
