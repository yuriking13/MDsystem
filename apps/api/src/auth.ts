import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from './env.js';

/** Время жизни access токена */
const ACCESS_TOKEN_EXPIRES = '7d';  // 7 дней для удобства, можно уменьшить до '1h' с refresh токенами

declare module 'fastify' {
  interface FastifyInstance {
    auth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; iat?: number; exp?: number };
    user: { sub: string; email: string; iat?: number; exp?: number };
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: ACCESS_TOKEN_EXPIRES,
    },
  });

  const authHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      const error = err as Error;
      // Различаем типы ошибок для лучшего UX
      if (error.name === 'TokenExpiredError') {
        return reply.code(401).send({ 
          error: 'TokenExpired', 
          message: 'Token has expired. Please log in again.' 
        });
      }
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  };

  // Декоратор auth (для обратной совместимости)
  app.decorate('auth', authHandler);
  // Декоратор authenticate (для settings.ts и новых routes)
  app.decorate('authenticate', authHandler);
});
