import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { getBoss } from '../worker/boss.js';

export async function searchRoutes(app: FastifyInstance) {
  // app.post('/api/projects/:id/search', { preHandler: [app.auth] }, async (req: any, reply) => {
  app.post('/api/projects/:id/search', async (req: any, reply) => {
    const userId = req.user.sub as string;
    const projectId = req.params.id as string;

    const membership = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
    if (!membership) return reply.code(403).send({ error: 'Forbidden' });

    const body = z.object({
      topic: z.string().min(2),
      filters: z.object({
        publishedFrom: z.string().optional(),
        publishedTo: z.string().optional(),
        freeFullTextOnly: z.boolean().default(true),
        publicationTypes: z.array(z.string()).default([])
      })
    }).parse(req.body);

    const query = await prisma.searchQuery.create({
      data: {
        projectId,
        topic: body.topic,
        filters: body.filters,
        status: 'queued'
      }
    });

    const boss = getBoss();
    await boss.publish('search:pubmed', { projectId, queryId: query.id });

    return { query };
  });
}
