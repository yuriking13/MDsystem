/**
 * Расширенные типы для Fastify
 * Обеспечивает типобезопасность для аутентификации и пользователя
 */

import { FastifyRequest, FastifyReply } from "fastify";

// Структура JWT payload
export interface JwtPayload {
  sub: string;  // ID пользователя
  email: string;
  iat?: number; // issued at
  exp?: number; // expires
}

// Расширяем FastifyRequest для типизации пользователя
declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
  
  interface FastifyInstance {
    auth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Типизированный Request с пользователем
export interface AuthenticatedRequest extends FastifyRequest {
  user: JwtPayload;
}

// Хелпер для извлечения userId из request
export function getUserId(request: FastifyRequest): string {
  const user = (request as any).user as JwtPayload | undefined;
  if (!user?.sub) {
    throw new Error("User not authenticated");
  }
  return user.sub;
}

// Хелпер для безопасного получения userId (может вернуть undefined)
export function getUserIdSafe(request: FastifyRequest): string | undefined {
  const user = (request as any).user as JwtPayload | undefined;
  return user?.sub;
}

export {};
