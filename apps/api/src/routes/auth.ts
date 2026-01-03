import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(8)
    }).parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.code(409).send({ error: 'User already exists' });

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await hashPassword(body.password)
      },
      select: { id: true, email: true }
    });

    // const token = app.jwt.sign({ sub: user.id, email: user.email });
    const token = 'mock-token';
    return { user, token };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' });

    const ok = await verifyPassword(user.passwordHash, body.password);
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });

    // const token = app.jwt.sign({ sub: user.id, email: user.email });
    const token = 'mock-token';
    return { user: { id: user.id, email: user.email }, token };
  });

  // app.get('/api/me', { preHandler: [app.auth] }, async (req: any) => {
  //   return { user: { id: req.user.sub, email: req.user.email } };
  // });
}
