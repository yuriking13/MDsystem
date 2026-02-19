import crypto from "crypto";

export const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildPasswordResetLink(
  frontendOrigin: string,
  token: string,
): string {
  try {
    const base = frontendOrigin.endsWith("/")
      ? frontendOrigin
      : `${frontendOrigin}/`;
    const url = new URL("reset-password", base);
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    const normalizedOrigin = frontendOrigin.replace(/\/+$/, "");
    return `${normalizedOrigin}/reset-password?token=${encodeURIComponent(token)}`;
  }
}
