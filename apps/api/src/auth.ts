import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from './env.js';

declare module 'fastify' {
  interface FastifyInstance {
    auth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: env.JWT_SECRET
  });

  const authHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  };

  // Декоратор auth (для обратной совместимости)
  app.decorate('auth', authHandler);
  // Декоратор authenticate (для settings.ts и новых routes)
  app.decorate('authenticate', authHandler);
});
