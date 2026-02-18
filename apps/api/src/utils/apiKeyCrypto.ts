import crypto from "node:crypto";
import { env } from "../env.js";

function deriveKey(secret: string): Buffer {
  // 32 bytes ключ для AES-256
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

const ACTIVE_KEY = deriveKey(env.API_KEY_ENCRYPTION_SECRET);
const DECRYPT_KEYS = [
  ACTIVE_KEY,
  ...(env.API_KEY_ENCRYPTION_SECRET_PREVIOUS
    ? [deriveKey(env.API_KEY_ENCRYPTION_SECRET_PREVIOUS)]
    : []),
];

export function encryptApiKey(plain: string): string {
  const iv = crypto.randomBytes(12); // GCM standard
  const cipher = crypto.createCipheriv("aes-256-gcm", ACTIVE_KEY, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptApiKey(stored: string): string {
  const [v, ivB64, ctB64, tagB64] = stored.split(":");
  if (v !== "v1" || !ivB64 || !ctB64 || !tagB64) {
    throw new Error("Unsupported encrypted key format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  for (const key of DECRYPT_KEYS) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return plain.toString("utf8");
    } catch {
      // try next rotation key
    }
  }

  throw new Error("Failed to decrypt API key with active or previous secrets");
}
