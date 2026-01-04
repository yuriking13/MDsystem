import crypto from "node:crypto";
import { env } from "../env.js";

function deriveKey(secret: string): Buffer {
  // 32 bytes ключ для AES-256
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

const KEY = deriveKey(env.API_KEY_ENCRYPTION_SECRET);

export function encryptApiKey(plain: string): string {
  const iv = crypto.randomBytes(12); // GCM standard
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
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

  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}
