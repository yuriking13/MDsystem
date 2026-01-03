import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

export async function projectRoutes(app: FastifyInstance) {
  app.get('/api/projects', { preHandler: [app.auth] }, async (req: any) => {
    const userId = req.user.sub as string;

    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      include: { project: true }
    });

    // owner projects without membership row тоже возможны, но мы добавляем membership при создании
    const projects = memberships.map((m) => ({
      id: m.project.id,
      title: m.project.title,
      role: m.role,
      createdAt: m.project.createdAt
    }));

    return { projects };
  });

  app.post('/api/projects', { preHandler: [app.auth] }, async (req: any) => {
    const userId = req.user.sub as string;
    const body = z.object({
      title: z.string().min(2),
      citationStyle: z.string().optional()
    }).parse(req.body);

    const project = await prisma.project.create({
      data: {
        title: body.title,
        citationStyle: body.citationStyle ?? 'gost-r-7-0-5-2008',
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'owner'
          }
        }
      },
      select: { id: true, title: true, citationStyle: true, createdAt: true }
    });

    return { project };
  });

  app.post('/api/projects/:id/add-member', { preHandler: [app.auth] }, async (req: any, reply) => {
    const userId = req.user.sub as string;
    const projectId = req.params.id as string;

    // Only owner can add members in MVP
    const me = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
    if (!me || me.role !== 'owner') return reply.code(403).send({ error: 'Forbidden' });

    const body = z.object({
      email: z.string().email(),
      role: z.enum(['editor', 'viewer']).default('editor')
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return reply.code(404).send({ error: 'User not found (ask them to register first)' });

    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: user.id } },
      create: { projectId, userId: user.id, role: body.role },
      update: { role: body.role }
    });

    return { ok: true };
  });
}
