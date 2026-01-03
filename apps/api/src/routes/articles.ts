import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';

export async function articleRoutes(app: FastifyInstance) {
  // app.get('/api/projects/:id/articles', { preHandler: [app.auth] }, async (req: any) => {
  app.get('/api/projects/:id/articles', async (req: any) => {
    const userId = req.user.sub as string;
    const projectId = req.params.id as string;
    const state = (req.query?.state as string | undefined) ?? 'found';

    const membership = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
    if (!membership) return { articles: [] };

    const rows = await prisma.articleProjectState.findMany({
      where: { projectId, state: state as any },
      include: { article: true },
      orderBy: { updatedAt: 'desc' },
      take: 200
    });

    const articles = rows.map((r: any) => ({
      ...r.article,
      state: r.state
    }));

    return { articles };
  });

  // app.post('/api/projects/:id/articles/:articleId/state', { preHandler: [app.auth] }, async (req: any, reply) => {
  app.post('/api/projects/:id/articles/:articleId/state', async (req: any, reply) => {
    const userId = req.user.sub as string;
    const projectId = req.params.id as string;
    const articleId = req.params.articleId as string;

    const membership = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
    if (!membership) return reply.code(403).send({ error: 'Forbidden' });

    const body = z.object({
      state: z.enum(['found', 'selected', 'excluded'])
    }).parse(req.body);

    const updated = await prisma.articleProjectState.update({
      where: { projectId_articleId: { projectId, articleId } },
      data: { state: body.state as any }
    });

    return { ok: true, updated };
  });
}
