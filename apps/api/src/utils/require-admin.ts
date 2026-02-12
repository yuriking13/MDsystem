import type { FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../pg.js";

/**
 * Shared guard for endpoints that should be available only to admins.
 */
export async function requireAdminAccess(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  // Refresh tokens are never allowed for protected API access.
  if (req.user?.type === "refresh") {
    return reply.code(401).send({
      error: "InvalidTokenType",
      message: "Access token required",
    });
  }

  const userId = req.user?.sub;
  if (!userId) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const result = await pool.query("SELECT is_admin FROM users WHERE id = $1", [
    userId,
  ]);

  if (!result.rowCount || !result.rows[0].is_admin) {
    return reply.code(403).send({ error: "Admin access required" });
  }
}
