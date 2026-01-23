/**
 * Централизованные функции для проверки доступа к проектам
 * Используются во всех routes для единообразной проверки прав
 */

import { pool } from "../pg.js";
import { prisma } from "../db.js";

export type ProjectAccessResult = {
  ok: boolean;
  role?: string;
  isOwner?: boolean;
  isMember?: boolean;
  canEdit?: boolean;
};

/**
 * Проверяет доступ пользователя к проекту через raw SQL (pg pool)
 * Используется в routes, которые работают напрямую с pool
 */
export async function checkProjectAccessPool(
  projectId: string,
  userId: string,
  requireEdit = false
): Promise<ProjectAccessResult> {
  const res = await pool.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  
  if (res.rowCount === 0) {
    return { ok: false };
  }
  
  const role = res.rows[0].role;
  const isOwner = role === "owner";
  const canEdit = isOwner || role === "editor";
  
  if (requireEdit && !canEdit) {
    return { ok: false, role, isOwner, canEdit };
  }
  
  return { ok: true, role, isOwner, canEdit, isMember: true };
}

/**
 * Проверяет доступ пользователя к проекту через Prisma
 * Используется в routes, которые работают с Prisma ORM
 */
export async function checkProjectAccessPrisma(
  userId: string,
  projectId: string
): Promise<ProjectAccessResult & { hasAccess: boolean }> {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { createdBy: true },
  });
  
  const isOwner = project?.createdBy === userId;
  const isMember = !!membership;
  const canEdit = isOwner || membership?.role === "editor";
  const hasAccess = isOwner || isMember;
  
  return {
    ok: hasAccess,
    isOwner,
    isMember,
    canEdit,
    hasAccess,
    role: membership?.role,
  };
}

/**
 * Получает API ключ пользователя для провайдера
 */
export async function getUserApiKey(
  userId: string,
  provider: string
): Promise<string | null> {
  const res = await pool.query(
    `SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );
  
  if (res.rowCount === 0) return null;
  
  const encrypted = res.rows[0].encrypted_key;
  
  try {
    const { decryptApiKey } = await import("./apiKeyCrypto.js");
    return decryptApiKey(encrypted);
  } catch {
    return null;
  }
}
