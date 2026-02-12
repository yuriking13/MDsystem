import crypto from "crypto";

export function generateAdminToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashAdminToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function normalizePagination(
  pageInput: number,
  limitInput: number,
  defaultLimit: number,
): { page: number; limit: number; offset: number } {
  const page =
    Number.isFinite(pageInput) && pageInput > 0 ? Math.floor(pageInput) : 1;
  const rawLimit =
    Number.isFinite(limitInput) && limitInput > 0
      ? Math.floor(limitInput)
      : defaultLimit;
  const limit = Math.min(rawLimit, 100);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
