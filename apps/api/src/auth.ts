import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyInstance } from 'fastify';
import { env } from './env.js';

declare module 'fastify' {
  interface FastifyInstance {
    auth: any;
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

  app.decorate('auth', async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});
