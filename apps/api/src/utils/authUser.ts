import type { FastifyInstance, FastifyRequest } from "fastify";
import { getDb } from "./db.js";

export type AuthUser = { id: string; email: string };
type TokenUserPayload = {
  id?: unknown;
  userId?: unknown;
  sub?: unknown;
  email?: unknown;
  user?: {
    id?: unknown;
    userId?: unknown;
    sub?: unknown;
    email?: unknown;
  };
};
type FastifyRequestWithTokenPayload = FastifyRequest & {
  user?: TokenUserPayload;
};

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function extractUserId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const tokenPayload = payload as TokenUserPayload;

  return (
    pickString(tokenPayload.id) ||
    pickString(tokenPayload.userId) ||
    pickString(tokenPayload.sub) ||
    pickString(tokenPayload.user?.id) ||
    pickString(tokenPayload.user?.userId) ||
    pickString(tokenPayload.user?.sub) ||
    null
  );
}

function extractEmail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const tokenPayload = payload as TokenUserPayload;

  return (
    pickString(tokenPayload.email) ||
    pickString(tokenPayload.user?.email) ||
    null
  );
}

export async function getAuthUser(
  fastify: FastifyInstance,
  request: FastifyRequest,
): Promise<AuthUser | null> {
  const payload = (request as FastifyRequestWithTokenPayload).user;

  const id = extractUserId(payload);
  const emailFromToken = extractEmail(payload);

  if (!id) return null;
  if (emailFromToken) return { id, email: emailFromToken };

  // Фоллбек: грузим email из БД
  const db = getDb(fastify);
  const res = await db.query(
    "select id, email from users where id = $1 limit 1",
    [id],
  );

  if (res.rowCount === 0) return null;
  return { id: String(res.rows[0].id), email: String(res.rows[0].email) };
}
