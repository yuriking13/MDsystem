import { FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../pg.js";
import crypto from "crypto";
import { createLogger } from "../../utils/logger.js";

const log = createLogger("admin-common");

/**
 * Generate secure admin token
 */
export function generateAdminToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash admin token for storage
 */
export function hashAdminToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Middleware to verify admin access
 */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const userId = (req.user as { sub: string }).sub;
  const result = await pool.query("SELECT is_admin FROM users WHERE id = $1", [
    userId,
  ]);

  if (!result.rowCount || !result.rows[0].is_admin) {
    return reply.code(403).send({ error: "Admin access required" });
  }
}

/**
 * Log admin actions for audit trail
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  details: Record<string, unknown>,
  ipAddress: string | null,
) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminId,
        action,
        targetType,
        targetId,
        JSON.stringify(details),
        ipAddress,
      ],
    );
  } catch (err) {
    log.error(
      "Failed to log admin action",
      err instanceof Error ? err : undefined,
      { action },
    );
  }
}

/**
 * Log system error
 */
export async function logSystemError(
  errorType: string,
  errorMessage: string,
  errorStack: string | null,
  userId: string | null,
  requestPath: string | null,
  requestMethod: string | null,
  requestBody: Record<string, unknown> | null,
  ipAddress: string | null,
) {
  try {
    await pool.query(
      `INSERT INTO system_error_logs 
       (error_type, error_message, error_stack, user_id, request_path, request_method, request_body, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        errorType,
        errorMessage,
        errorStack,
        userId,
        requestPath,
        requestMethod,
        JSON.stringify(requestBody),
        ipAddress,
      ],
    );
  } catch (err) {
    log.error(
      "Failed to log system error",
      err instanceof Error ? err : undefined,
      { errorType },
    );
  }
}

/**
 * Get user ID from request
 */
export function getAdminUserId(req: FastifyRequest): string {
  return (req.user as { sub: string }).sub;
}
