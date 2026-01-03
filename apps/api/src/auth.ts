import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { env } from './env.js';

export default fp(async (fastify) => {
  fastify.register(jwt, {
    secret: env.JWT_SECRET
  });

  fastify.decorate('auth', async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    auth: any;
  }
}
