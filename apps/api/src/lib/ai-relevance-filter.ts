/**
 * AI Relevance Filter — проверка статей на соответствие поисковому запросу
 *
 * Использует Claude через OpenRouter для анализа title + abstract
 * и определения, действительно ли статья релевантна запросу пользователя.
 *
 * Обрабатывает статьи батчами по 200 штук за один API вызов.
 */

import { createLogger } from "../utils/logger.js";

const log = createLogger("ai-relevance-filter");
const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

// Модель с большим контекстным окном для анализа батчей
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";
const BATCH_SIZE = 200;

export type RelevanceArticle = {
  idx: number;
  title: string;
  abstract?: string;
};

export type RelevanceResult = {
  totalInput: number;
  totalRelevant: number;
  totalIrrelevant: number;
  relevantIndices: Set<number>;
};

/**
 * Фильтрует один батч статей через AI — проверяет релевантность запросу
 *
 * @returns Set индексов статей, которые РЕЛЕВАНТНЫ запросу
 */
async function filterBatchWithAI(args: {
  articles: RelevanceArticle[];
  query: string;
  apiKey: string;
  model?: string;
}): Promise<Set<number>> {
  const { articles, query, apiKey, model = DEFAULT_MODEL } = args;

  if (articles.length === 0) return new Set();

  // Формируем список статей для анализа
  const articlesList = articles
    .map((a) => {
      const abs = a.abstract
        ? `\n   Abstract: ${a.abstract.slice(0, 500)}`
        : "";
      return `[${a.idx}] Title: ${a.title}${abs}`;
    })
    .join("\n\n");

  const systemPrompt = `You are an expert research librarian conducting a systematic literature review.

Your task: evaluate whether each article is RELEVANT to the user's search query.

CRITERIA for relevance:
- The article's title and/or abstract directly address the topic of the search query
- The article discusses the same medical condition, treatment, population, or outcome
- The article provides information that would be useful for a systematic review on this topic

CRITERIA for IRRELEVANCE (remove these):
- The article is about a completely different topic that merely shares a keyword
- The article discusses a different medical condition despite similar terminology
- The article is from a completely unrelated field
- The title/abstract show no meaningful connection to the search query

Be INCLUSIVE rather than exclusive — when in doubt, keep the article.
Only remove clearly irrelevant articles.

RESPOND with ONLY a JSON object in this exact format:
{
  "relevant": [1, 2, 5, 7],
  "irrelevant": [3, 4, 6, 8],
  "reasoning_sample": "Brief note on why some were excluded"
}

The numbers are the article indices [N] from the list.
Include ALL article indices in either "relevant" or "irrelevant".`;

  const userPrompt = `SEARCH QUERY: "${query}"

ARTICLES TO EVALUATE (${articles.length} total):

${articlesList}

Evaluate each article's relevance to the search query. Return JSON with "relevant" and "irrelevant" arrays of indices.`;

  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://mdsystem.app",
        "X-Title": "MDsystem Relevance Filter",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      log.error(`OpenRouter error ${res.status}: ${err.slice(0, 200)}`);
      // On API error, keep all articles (fail-safe)
      return new Set(articles.map((a) => a.idx));
    }

    type OpenRouterResponse = {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const data = (await res.json()) as OpenRouterResponse;
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      log.warn("Empty AI response, keeping all articles");
      return new Set(articles.map((a) => a.idx));
    }

    // Parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        log.warn("No JSON found in AI response, keeping all articles");
        return new Set(articles.map((a) => a.idx));
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        relevant?: number[];
        irrelevant?: number[];
        reasoning_sample?: string;
      };

      const allowedIndices = new Set(articles.map((a) => a.idx));
      const relevant = new Set<number>(
        (parsed.relevant || []).filter(
          (idx) => Number.isInteger(idx) && allowedIndices.has(idx),
        ),
      );

      // Log filtering result
      const removedCount = (parsed.irrelevant || []).length;
      if (removedCount > 0 && parsed.reasoning_sample) {
        log.info(
          `Filtered out ${removedCount}/${articles.length} articles. Reason: ${parsed.reasoning_sample}`,
        );
      }

      // Safety check: if AI removed more than 80% of articles, something is wrong
      if (relevant.size < articles.length * 0.2) {
        log.warn(
          `AI removed >80% of articles (${relevant.size}/${articles.length}), keeping all as safety measure`,
        );
        return new Set(articles.map((a) => a.idx));
      }

      // If response contains no valid indices from this batch, keep all.
      if (relevant.size === 0) {
        log.warn(
          "AI returned no valid relevance indices for this batch, keeping all articles",
        );
        return new Set(articles.map((a) => a.idx));
      }

      return relevant;
    } catch (parseErr) {
      log.error(
        "Failed to parse AI relevance response",
        parseErr instanceof Error ? parseErr : new Error(String(parseErr)),
      );
      return new Set(articles.map((a) => a.idx));
    }
  } catch (err) {
    log.error(
      "AI relevance filter request failed",
      err instanceof Error ? err : new Error(String(err)),
    );
    // On error, keep all articles (fail-safe)
    return new Set(articles.map((a) => a.idx));
  }
}

/**
 * Фильтрует массив статей на релевантность поисковому запросу.
 * Обрабатывает батчами по BATCH_SIZE (200) статей.
 *
 * @param articles - массив статей с полями title и abstract
 * @param query - поисковый запрос пользователя
 * @param apiKey - OpenRouter API key
 * @param onProgress - callback для отслеживания прогресса
 * @returns объект с индексами релевантных статей и статистикой
 */
export async function filterArticlesByRelevance<
  T extends { title: string; abstract?: string },
>(args: {
  articles: T[];
  query: string;
  apiKey: string;
  model?: string;
  onProgress?: (processed: number, total: number, kept: number) => void;
}): Promise<{
  relevant: T[];
  removed: number;
  total: number;
}> {
  const { articles, query, apiKey, model, onProgress } = args;

  if (articles.length === 0) {
    return { relevant: [], removed: 0, total: 0 };
  }

  // If no API key, skip filtering
  if (!apiKey) {
    log.warn("No API key provided, skipping relevance filter");
    return { relevant: articles, removed: 0, total: articles.length };
  }

  const relevantArticles: T[] = [];
  let totalProcessed = 0;

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    // Prepare batch with indices
    const batchWithIndices: RelevanceArticle[] = batch.map((a, batchIdx) => ({
      // Use 1-based local indices inside each batch to match prompt examples.
      idx: batchIdx + 1,
      title: a.title,
      abstract: a.abstract,
    }));

    // Filter batch through AI
    const relevantIndices = await filterBatchWithAI({
      articles: batchWithIndices,
      query,
      apiKey,
      model,
    });

    // Collect relevant articles
    for (const item of batchWithIndices) {
      if (relevantIndices.has(item.idx)) {
        relevantArticles.push(batch[item.idx - 1]);
      }
    }

    totalProcessed += batch.length;

    // Report progress
    if (onProgress) {
      onProgress(totalProcessed, articles.length, relevantArticles.length);
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < articles.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const removed = articles.length - relevantArticles.length;

  log.info(
    `Relevance filter: ${relevantArticles.length}/${articles.length} articles kept (${removed} removed)`,
  );

  return {
    relevant: relevantArticles,
    removed,
    total: articles.length,
  };
}
