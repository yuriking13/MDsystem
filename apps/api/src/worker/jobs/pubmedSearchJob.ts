import { prisma } from '../../db.js';
import { pubmedFetchAll } from '../../lib/pubmed.js';
import { env } from '../../env.js';
import { extractStats, hasAnyStats } from '../../lib/stats.js';

export async function runPubmedSearchJob(payload: { projectId: string; queryId: string }) {
  const query = await prisma.searchQuery.findUnique({ where: { id: payload.queryId } });
  if (!query) return;

  await prisma.searchQuery.update({ where: { id: query.id }, data: { status: 'running' } });

  try {
    const filters = query.filters as any;

    const result = await pubmedFetchAll({
      // apiKey: env.PUBMED_API_KEY || undefined,
      topic: query.topic,
      filters: {
        publishedFrom: filters.publishedFrom,
        publishedTo: filters.publishedTo,
        freeFullTextOnly: filters.freeFullTextOnly ?? true,
        publicationTypes: filters.publicationTypes ?? []
      },
      batchSize: 200,
      throttleMs: 120,
      maxTotal: 5000
    });

    for (const it of result.items) {
      const stats = extractStats(it.abstract);
      const hasStats = hasAnyStats(stats);

      // Upsert article by DOI if possible, else by PMID
      let article;
      if (it.doi) {
        article = await prisma.article.upsert({
          where: { doi: it.doi },
          create: {
            doi: it.doi,
            pmid: it.pmid,
            titleEn: it.title || '(no title)',
            abstractEn: it.abstract,
            authors: it.authors,
            journal: it.journal,
            year: it.year,
            url: it.url,
            source: 'pubmed',
            studyTypes: it.studyTypes ?? [],
            stats: stats as any,
            hasStats
          },
          update: {
            pmid: it.pmid ?? undefined,
            titleEn: it.title || '(no title)',
            abstractEn: it.abstract,
            authors: it.authors,
            journal: it.journal,
            year: it.year,
            url: it.url,
            stats: stats as any,
            hasStats
          }
        });
      } else {
        article = await prisma.article.upsert({
          where: { pmid: it.pmid },
          create: {
            pmid: it.pmid,
            doi: it.doi,
            titleEn: it.title || '(no title)',
            abstractEn: it.abstract,
            authors: it.authors,
            journal: it.journal,
            year: it.year,
            url: it.url,
            source: 'pubmed',
            studyTypes: it.studyTypes ?? [],
            stats: stats as any,
            hasStats
          },
          update: {
            doi: it.doi ?? undefined,
            titleEn: it.title || '(no title)',
            abstractEn: it.abstract,
            authors: it.authors,
            journal: it.journal,
            year: it.year,
            url: it.url,
            stats: stats as any,
            hasStats
          }
        });
      }

      await prisma.articleProjectState.upsert({
        where: { projectId_articleId: { projectId: payload.projectId, articleId: article.id } },
        create: {
          projectId: payload.projectId,
          articleId: article.id,
          state: 'found',
          sourceQueryId: payload.queryId
        },
        update: {
          sourceQueryId: payload.queryId
        }
      });
    }

    await prisma.searchQuery.update({ where: { id: query.id }, data: { status: 'done' } });
  } catch (e: any) {
    await prisma.searchQuery.update({ where: { id: query.id }, data: { status: 'error' } });
    throw e;
  }
}
