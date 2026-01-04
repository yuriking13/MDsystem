import type { FastifyInstance, FastifyRequest } from "fastify";
import { getDb } from "./db.js";

export type AuthUser = { id: string; email: string };

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function extractUserId(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;

  return (
    pickString(payload.id) ||
    pickString(payload.userId) ||
    pickString(payload.sub) ||
    pickString(payload?.user?.id) ||
    pickString(payload?.user?.userId) ||
    pickString(payload?.user?.sub) ||
    null
  );
}

function extractEmail(payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;

  return pickString(payload.email) || pickString(payload?.user?.email) || null;
}

export async function getAuthUser(
  fastify: FastifyInstance,
  request: FastifyRequest,
): Promise<AuthUser | null> {
  const anyReq = request as any;
  const payload = anyReq.user;

  const id = extractUserId(payload);
  const emailFromToken = extractEmail(payload);

  if (!id) return null;
  if (emailFromToken) return { id, email: emailFromToken };

  // Фоллбек: грузим email из БД
  const db = getDb(fastify);
  const res = await db.query("select id, email from users where id = $1 limit 1", [id]);

  if (res.rowCount === 0) return null;
  return { id: String(res.rows[0].id), email: String(res.rows[0].email) };
}
