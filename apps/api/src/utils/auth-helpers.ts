/**
 * Хелперы для работы с аутентификацией
 */

import { FastifyRequest } from "fastify";

/**
 * Хелпер для извлечения userId из request
 * Бросает ошибку если пользователь не аутентифицирован
 * 
 * @example
 * const userId = getUserId(request);
 */
export function getUserId(request: FastifyRequest): string {
  const user = (request as any).user;
  if (!user?.sub) {
    throw new Error("User not authenticated");
  }
  return user.sub;
}

/**
 * Хелпер для безопасного получения userId (может вернуть undefined)
 * Используйте когда аутентификация опциональна
 * 
 * @example
 * const userId = getUserIdSafe(request);
 * if (userId) { ... }
 */
export function getUserIdSafe(request: FastifyRequest): string | undefined {
  return (request as any).user?.sub;
}

/**
 * Хелпер для получения email из request
 */
export function getUserEmail(request: FastifyRequest): string | undefined {
  return (request as any).user?.email;
}
