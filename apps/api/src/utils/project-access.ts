/**
 * Централизованные функции для проверки доступа к проектам
 * Используются во всех routes для единообразной проверки прав
 * 
 * ОПТИМИЗАЦИЯ: Встроенный in-memory кэш для checkProjectAccess
 * - Снижает нагрузку на БД при множественных запросах
 * - TTL = 30 секунд (баланс между свежестью и производительностью)
 * - Автоматическая инвалидация при изменении прав
 */

import { pool } from "../pg.js";
import { prisma } from "../db.js";
import { LRUCache } from "lru-cache";

export type ProjectAccessResult = {
  ok: boolean;
  role?: string;
  isOwner?: boolean;
  isMember?: boolean;
  canEdit?: boolean;
};

// ============================================================
// In-memory кэш для project access
// ============================================================

interface AccessCacheEntry {
  result: ProjectAccessResult;
  timestamp: number;
}

// LRU кэш: максимум 1000 записей, TTL 30 секунд
const accessCache = new LRUCache<string, AccessCacheEntry>({
  max: 1000,
  ttl: 30000, // 30 секунд
});

// Статистика кэша
let cacheHits = 0;
let cacheMisses = 0;

function getCacheKey(projectId: string, userId: string): string {
  return `${projectId}:${userId}`;
}

/**
 * Получить статистику кэша доступа
 */
export function getAccessCacheStats() {
  return {
    size: accessCache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: cacheHits + cacheMisses > 0 
      ? ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1) + '%'
      : 'N/A',
  };
}

/**
 * Инвалидировать кэш доступа для проекта
 * Вызывать при изменении членства в проекте
 */
export function invalidateProjectAccess(projectId: string, userId?: string): void {
  if (userId) {
    accessCache.delete(getCacheKey(projectId, userId));
  } else {
    // Инвалидируем всех пользователей проекта
    for (const key of accessCache.keys()) {
      if (key.startsWith(`${projectId}:`)) {
        accessCache.delete(key);
      }
    }
  }
}

/**
 * Проверяет доступ пользователя к проекту через raw SQL (pg pool)
 * С КЭШИРОВАНИЕМ - результат кэшируется на 30 секунд
 */
export async function checkProjectAccessPool(
  projectId: string,
  userId: string,
  requireEdit = false
): Promise<ProjectAccessResult> {
  const cacheKey = getCacheKey(projectId, userId);
  
  // Проверяем кэш
  const cached = accessCache.get(cacheKey);
  if (cached) {
    cacheHits++;
    const result = cached.result;
    // Проверяем requireEdit на закэшированном результате
    if (requireEdit && !result.canEdit) {
      return { ok: false, role: result.role, isOwner: result.isOwner, canEdit: result.canEdit };
    }
    return result;
  }
  
  cacheMisses++;
  
  // Запрос к БД
  const res = await pool.query(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  
  if (res.rowCount === 0) {
    const result: ProjectAccessResult = { ok: false };
    accessCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }
  
  const role = res.rows[0].role;
  const isOwner = role === "owner";
  const canEdit = isOwner || role === "editor";
  
  // Кэшируем базовый результат (без requireEdit)
  const result: ProjectAccessResult = { ok: true, role, isOwner, canEdit, isMember: true };
  accessCache.set(cacheKey, { result, timestamp: Date.now() });
  
  // Проверяем requireEdit
  if (requireEdit && !canEdit) {
    return { ok: false, role, isOwner, canEdit };
  }
  
  return result;
}

/**
 * Проверяет доступ пользователя к проекту через Prisma
 * Используется в routes, которые работают с Prisma ORM
 */
export async function checkProjectAccessPrisma(
  userId: string,
  projectId: string
): Promise<ProjectAccessResult & { hasAccess: boolean }> {
  const cacheKey = getCacheKey(projectId, userId);
  
  // Проверяем кэш
  const cached = accessCache.get(cacheKey);
  if (cached) {
    cacheHits++;
    const r = cached.result;
    return {
      ok: r.ok,
      isOwner: r.isOwner,
      isMember: r.isMember,
      canEdit: r.canEdit,
      hasAccess: r.ok,
      role: r.role,
    };
  }
  
  cacheMisses++;
  
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
  
  // Кэшируем результат
  const result: ProjectAccessResult = {
    ok: hasAccess,
    isOwner,
    isMember,
    canEdit,
    role: membership?.role,
  };
  accessCache.set(cacheKey, { result, timestamp: Date.now() });
  
  return {
    ...result,
    hasAccess,
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
