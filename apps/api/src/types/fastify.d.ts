/**
 * Расширенные типы для Fastify
 * Обеспечивает типобезопасность для аутентификации и пользователя
 */

import { FastifyRequest, FastifyReply } from "fastify";

// Структура JWT payload
export interface JwtPayload {
  sub: string;  // ID пользователя
  email: string;
  isAdmin?: boolean; // Admin flag for admin panel
  iat?: number; // issued at
  exp?: number; // expires
}

// Расширяем типы @fastify/jwt
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
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

export {};
