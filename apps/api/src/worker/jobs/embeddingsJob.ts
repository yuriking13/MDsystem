import { pool } from "../../pg.js";
import { decryptApiKey } from "../../utils/apiKeyCrypto.js";
import { createLogger } from "../../utils/logger.js";
import { broadcastToProject } from "../../websocket.js";
import type { EmbeddingsJobPayload } from "../types.js";

const log = createLogger("embeddings-job");

// Константы
const MAX_JOB_DURATION_MS = 60 * 60 * 1000; // 1 час максимум
const RATE_LIMIT_DELAY_MS = 100; // 100ms между запросами

// Получаем API ключ пользователя из базы
async function getUserApiKey(
  userId: string,
  provider: string,
): Promise<string | null> {
  const result = await pool.query(
    `SELECT encrypted_key FROM user_api_keys WHERE user_id = $1 AND provider = $2`,
    [userId, provider],
  );
  if (result.rows.length === 0) return null;
  return decryptApiKey(result.rows[0].encrypted_key);
}

// Генерация embedding через OpenRouter
async function generateEmbedding(
  text: string,
  apiKey: string,
): Promise<number[]> {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://lilitomukib.beget.app",
      "X-Title": "MDsystem",
    },
    body: JSON.stringify({
      input: text.trim().slice(0, 8000),
      model: "openai/text-embedding-3-small",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0].embedding;
}

// Обновление прогресса в БД и через WebSocket
async function updateProgress(
  jobId: string,
  projectId: string,
  updates: {
    processed?: number;
    total?: number;
    errors?: number;
    status?: string;
    phase?: string;
  },
) {
  const setClauses: string[] = ["updated_at = now()"];
  const values: any[] = [];
  let paramIdx = 1;

  if (updates.processed !== undefined) {
    setClauses.push(`processed = $${paramIdx++}`);
    values.push(updates.processed);
  }
  if (updates.total !== undefined) {
    setClauses.push(`total = $${paramIdx++}`);
    values.push(updates.total);
  }
  if (updates.errors !== undefined) {
    setClauses.push(`errors = $${paramIdx++}`);
    values.push(updates.errors);
  }
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    values.push(updates.status);
  }

  values.push(jobId);

  await pool.query(
    `UPDATE embedding_jobs SET ${setClauses.join(", ")} WHERE id = $${paramIdx}`,
    values,
  );

  // Отправляем WebSocket событие
  broadcastToProject(projectId, {
    type: "embedding:progress" as any,
    projectId,
    payload: {
      jobId,
      ...updates,
    },
    timestamp: Date.now(),
  });
}

// Проверка отмены
async function isJobCancelled(jobId: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT status FROM embedding_jobs WHERE id = $1`,
    [jobId],
  );
  if (res.rows.length === 0) return true;
  return res.rows[0].status === "cancelled";
}

export async function runEmbeddingsJob(payload: EmbeddingsJobPayload) {
  const {
    projectId,
    jobId,
    userId,
    articleIds,
    includeReferences = true,
    includeCitedBy = true,
  } = payload;
  const startTime = Date.now();

  log.info("Starting embeddings job", { jobId, projectId, userId });

  try {
    // Обновляем статус на running
    await pool.query(
      `UPDATE embedding_jobs SET status = 'running', started_at = now() WHERE id = $1`,
      [jobId],
    );

    // Получаем API ключ OpenRouter пользователя
    const apiKey = await getUserApiKey(userId, "openrouter");
    if (!apiKey) {
      throw new Error("OpenRouter API key not found. Add it in user settings.");
    }

    // Получаем статьи для обработки
    let articles;
    if (articleIds && articleIds.length > 0) {
      articles = await pool.query(
        `SELECT a.id, a.title_en, a.abstract_en
         FROM articles a
         WHERE a.id = ANY($1)
           AND NOT EXISTS (SELECT 1 FROM article_embeddings ae WHERE ae.article_id = a.id)`,
        [articleIds],
      );
    } else {
      const query = `
        WITH project_article_ids AS (
          SELECT a.id
          FROM articles a
          JOIN project_articles pa ON pa.article_id = a.id
          WHERE pa.project_id = $1 AND pa.status != 'deleted'
        ),
        reference_article_ids AS (
          SELECT DISTINCT ref_article.id
          FROM articles a
          JOIN project_articles pa ON pa.article_id = a.id
          CROSS JOIN LATERAL unnest(COALESCE(a.reference_pmids, ARRAY[]::text[])) AS ref_pmid
          JOIN articles ref_article ON ref_article.pmid = ref_pmid
          WHERE pa.project_id = $1 AND pa.status != 'deleted'
            AND $2 = true
        ),
        cited_by_article_ids AS (
          SELECT DISTINCT cited_article.id
          FROM articles a
          JOIN project_articles pa ON pa.article_id = a.id
          CROSS JOIN LATERAL unnest(COALESCE(a.cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
          JOIN articles cited_article ON cited_article.pmid = cited_pmid
          WHERE pa.project_id = $1 AND pa.status != 'deleted'
            AND $3 = true
        ),
        all_graph_article_ids AS (
          SELECT id FROM project_article_ids
          UNION
          SELECT id FROM reference_article_ids
          UNION
          SELECT id FROM cited_by_article_ids
        )
        SELECT a.id, a.title_en, a.abstract_en
        FROM articles a
        JOIN all_graph_article_ids ag ON ag.id = a.id
        LEFT JOIN article_embeddings ae ON ae.article_id = a.id
        WHERE ae.article_id IS NULL
      `;
      articles = await pool.query(query, [
        projectId,
        includeReferences,
        includeCitedBy,
      ]);
    }

    const totalArticles = articles.rows.length;
    let processed = 0;
    let errors = 0;

    log.info("Found articles to process", { jobId, total: totalArticles });

    // Обновляем total - ВАЖНО: устанавливаем реальное количество статей
    // Это может отличаться от изначального missingCount если статьи добавились
    await pool.query(
      `UPDATE embedding_jobs SET total = $2, processed = 0, errors = 0, status = 'running' WHERE id = $1`,
      [jobId, totalArticles],
    );

    // Отправляем WebSocket событие с актуальным total
    broadcastToProject(projectId, {
      type: "embedding:progress" as any,
      projectId,
      payload: {
        jobId,
        total: totalArticles,
        processed: 0,
        errors: 0,
        status: "running",
      },
      timestamp: Date.now(),
    });

    if (totalArticles === 0) {
      await pool.query(
        `UPDATE embedding_jobs SET status = 'completed', completed_at = now(), processed = 0, total = 0, errors = 0 WHERE id = $1`,
        [jobId],
      );
      broadcastToProject(projectId, {
        type: "embedding:completed" as any,
        projectId,
        payload: { jobId, processed: 0, total: 0, errors: 0 },
        timestamp: Date.now(),
      });
      return;
    }

    // Обрабатываем статьи
    for (const article of articles.rows) {
      // Проверяем таймаут
      if (Date.now() - startTime > MAX_JOB_DURATION_MS) {
        log.warn("Job exceeded max duration", { jobId });
        await pool.query(
          `UPDATE embedding_jobs SET status = 'timeout', error_message = 'Exceeded max duration (1 hour)' WHERE id = $1`,
          [jobId],
        );
        broadcastToProject(projectId, {
          type: "embedding:error" as any,
          projectId,
          payload: {
            jobId,
            error: "Timeout: exceeded 1 hour limit",
            processed,
            total: totalArticles,
            errors,
          },
          timestamp: Date.now(),
        });
        return;
      }

      // Проверяем отмену
      if (await isJobCancelled(jobId)) {
        log.info("Job cancelled", { jobId });
        broadcastToProject(projectId, {
          type: "embedding:cancelled" as any,
          projectId,
          payload: { jobId, processed, total: totalArticles, errors },
          timestamp: Date.now(),
        });
        return;
      }

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

        // Обновляем статус статьи
        await pool.query(
          `UPDATE articles SET embedding_status = 'completed' WHERE id = $1`,
          [article.id],
        );

        processed++;

        // Отправляем прогресс каждые 5 статей или в конце
        if (processed % 5 === 0 || processed === totalArticles) {
          await updateProgress(jobId, projectId, { processed, errors });
        }

        // Rate limiting
        await new Promise((resolve) =>
          setTimeout(resolve, RATE_LIMIT_DELAY_MS),
        );
      } catch (err) {
        log.error("Error processing article", err, {
          jobId,
          articleId: article.id,
        });
        errors++;

        // Обновляем статус ошибки для статьи
        await pool.query(
          `UPDATE articles SET embedding_status = 'error' WHERE id = $1`,
          [article.id],
        );
      }
    }

    // Завершаем job
    await pool.query(
      `UPDATE embedding_jobs SET 
        status = 'completed', 
        completed_at = now(), 
        processed = $2, 
        total = $3, 
        errors = $4 
       WHERE id = $1`,
      [jobId, processed, totalArticles, errors],
    );

    broadcastToProject(projectId, {
      type: "embedding:completed" as any,
      projectId,
      payload: { jobId, processed, total: totalArticles, errors },
      timestamp: Date.now(),
    });

    log.info("Embeddings job completed", {
      jobId,
      processed,
      total: totalArticles,
      errors,
    });
  } catch (err) {
    log.error("Embeddings job failed", err, { jobId });

    const errorMessage = err instanceof Error ? err.message : String(err);

    await pool.query(
      `UPDATE embedding_jobs SET status = 'failed', error_message = $2 WHERE id = $1`,
      [jobId, errorMessage],
    );

    broadcastToProject(projectId, {
      type: "embedding:error" as any,
      projectId,
      payload: { jobId, error: errorMessage },
      timestamp: Date.now(),
    });

    throw err;
  }
}
