/**
 * Semantic Search для графа цитирований
 *
 * Использует OpenAI embeddings для поиска похожих статей по смыслу
 * Работает даже без прямых цитирований
 */

import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import { pool } from "../pg.js";
import { getUserId } from "../utils/auth-helpers.js";
import { getUserApiKey } from "../utils/project-access.js";

const semanticSearchQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7), // Cosine similarity threshold
});

const generateEmbeddingsBodySchema = z.object({
  articleIds: z.array(z.string().uuid()).optional(),
  batchSize: z.number().int().min(1).max(100).default(50),
});

export const semanticSearchRoutes: FastifyPluginCallback = (
  fastify,
  _opts,
  done,
) => {
  /**
   * POST /projects/:projectId/citation-graph/semantic-search
   * Семантический поиск по графу
   */
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof semanticSearchQuerySchema>;
  }>(
    "/projects/:projectId/citation-graph/semantic-search",
    async (request, reply) => {
      const { projectId } = request.params;
      const parsedBody = semanticSearchQuerySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply
          .code(400)
          .send({ error: "Invalid request body", details: parsedBody.error });
      }

      const { query, limit, threshold } = parsedBody.data;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        // Получаем API ключ OpenAI пользователя
        const apiKey = await getUserApiKey(userId, "openai");
        if (!apiKey) {
          return reply.code(400).send({
            error: "OpenAI API key not configured. Please add it in settings.",
          });
        }

        // Генерируем embedding для запроса
        const queryEmbedding = await generateEmbedding(query, apiKey);

        // Ищем похожие статьи в проекте
        const results = await pool.query(
          `SELECT 
             a.id,
             a.title_en,
             a.title_ru,
             a.abstract_en,
             a.year,
             a.authors,
             a.journal,
             a.doi,
             a.pmid,
             pa.status,
             1 - (ae.embedding <=> $1::vector) as similarity
           FROM article_embeddings ae
           JOIN articles a ON a.id = ae.article_id
           JOIN project_articles pa ON pa.article_id = a.id
           WHERE pa.project_id = $2
             AND pa.status != 'deleted'
             AND 1 - (ae.embedding <=> $1::vector) >= $3
           ORDER BY similarity DESC
           LIMIT $4`,
          [`[${queryEmbedding.join(",")}]`, projectId, threshold, limit],
        );

        return {
          query,
          results: results.rows.map((row: any) => ({
            id: row.id,
            title: row.title_ru || row.title_en,
            titleEn: row.title_en,
            abstract: row.abstract_en,
            year: row.year,
            authors: row.authors,
            journal: row.journal,
            doi: row.doi,
            pmid: row.pmid,
            status: row.status,
            similarity: parseFloat(row.similarity),
          })),
          totalFound: results.rows.length,
          threshold,
        };
      } catch (error: any) {
        fastify.log.error("Semantic search error:", error);
        return reply.code(500).send({
          error: "Failed to perform semantic search",
          details: error.message,
        });
      }
    },
  );

  /**
   * POST /projects/:projectId/citation-graph/generate-embeddings
   * Генерация embeddings для статей проекта
   */
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof generateEmbeddingsBodySchema>;
  }>(
    "/projects/:projectId/citation-graph/generate-embeddings",
    async (request, reply) => {
      const { projectId } = request.params;
      const parsedBody = generateEmbeddingsBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply
          .code(400)
          .send({ error: "Invalid request body", details: parsedBody.error });
      }

      const { articleIds, batchSize } = parsedBody.data;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        // Получаем API ключ
        const apiKey = await getUserApiKey(userId, "openai");
        if (!apiKey) {
          return reply.code(400).send({
            error: "OpenAI API key required",
          });
        }

        // Получаем статьи для обработки
        let articles;
        if (articleIds && articleIds.length > 0) {
          articles = await pool.query(
            `SELECT a.id, a.title_en, a.abstract_en
             FROM articles a
             JOIN project_articles pa ON pa.article_id = a.id
             WHERE pa.project_id = $1 
               AND a.id = ANY($2)
               AND pa.status != 'deleted'`,
            [projectId, articleIds],
          );
        } else {
          // Берем статьи без embeddings
          articles = await pool.query(
            `SELECT a.id, a.title_en, a.abstract_en
             FROM articles a
             JOIN project_articles pa ON pa.article_id = a.id
             LEFT JOIN article_embeddings ae ON ae.article_id = a.id
             WHERE pa.project_id = $1 
               AND pa.status != 'deleted'
               AND ae.article_id IS NULL
             LIMIT $2`,
            [projectId, batchSize],
          );
        }

        const totalArticles = articles.rows.length;
        let processed = 0;
        let errors = 0;

        // Обрабатываем пакетами
        for (const article of articles.rows) {
          try {
            const text = [article.title_en, article.abstract_en]
              .filter(Boolean)
              .join(" ");

            if (!text.trim()) {
              errors++;
              continue;
            }

            const embedding = await generateEmbedding(text, apiKey);

            // Сохраняем embedding
            await pool.query(
              `INSERT INTO article_embeddings (article_id, embedding, model)
               VALUES ($1, $2, 'text-embedding-3-small')
               ON CONFLICT (article_id) 
               DO UPDATE SET 
                 embedding = EXCLUDED.embedding,
                 model = EXCLUDED.model,
                 updated_at = NOW()`,
              [article.id, `[${embedding.join(",")}]`],
            );

            // Обновляем статус
            await pool.query(
              `UPDATE articles SET embedding_status = 'completed' WHERE id = $1`,
              [article.id],
            );

            processed++;

            // Небольшая задержка для rate limiting
            if (processed % 10 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } catch (error: any) {
            fastify.log.error(
              `Failed to process article ${article.id}:`,
              error,
            );
            errors++;
          }
        }

        return {
          success: true,
          total: totalArticles,
          processed,
          errors,
          remaining: totalArticles - processed - errors,
        };
      } catch (error: any) {
        fastify.log.error("Generate embeddings error:", error);
        return reply.code(500).send({
          error: "Failed to generate embeddings",
          details: error.message,
        });
      }
    },
  );

  /**
   * GET /projects/:projectId/citation-graph/embedding-stats
   * Статистика embeddings для проекта
   */
  fastify.get<{
    Params: { projectId: string };
  }>(
    "/projects/:projectId/citation-graph/embedding-stats",
    {
      schema: {
        params: z.object({ projectId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const userId = getUserId(request);

      if (!userId) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      try {
        const stats = await pool.query(
          `SELECT 
             COUNT(DISTINCT a.id) as total_articles,
             COUNT(DISTINCT ae.article_id) as articles_with_embeddings,
             COUNT(DISTINCT a.id) - COUNT(DISTINCT ae.article_id) as articles_without_embeddings
           FROM articles a
           JOIN project_articles pa ON pa.article_id = a.id
           LEFT JOIN article_embeddings ae ON ae.article_id = a.id
           WHERE pa.project_id = $1 AND pa.status != 'deleted'`,
          [projectId],
        );

        const row = stats.rows[0];
        return {
          totalArticles: parseInt(row.total_articles),
          withEmbeddings: parseInt(row.articles_with_embeddings),
          withoutEmbeddings: parseInt(row.articles_without_embeddings),
          completionRate:
            parseInt(row.total_articles) > 0
              ? (parseInt(row.articles_with_embeddings) /
                  parseInt(row.total_articles)) *
                100
              : 0,
        };
      } catch (error: any) {
        fastify.log.error("Embedding stats error:", error);
        return reply.code(500).send({
          error: "Failed to get embedding stats",
          details: error.message,
        });
      }
    },
  );

  done();
};

// Helper function для генерации embeddings через OpenAI
async function generateEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text.trim().slice(0, 8000), // Truncate to OpenAI limit
      model: "text-embedding-3-small",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0].embedding;
}
