/**
 * AI Writing Assistant API routes
 *
 * Endpoints:
 * 1. POST /api/projects/:projectId/ai-writing-assistant/improve
 *    - Accepts selected text, returns 2 academic improvement variants
 *    - If text contains bibliography references (DOI), attempts to find full text
 *
 * 2. POST /api/projects/:projectId/ai-writing-assistant/generate-table
 *    - Generates a table/chart data from selected text
 *
 * 3. POST /api/projects/:projectId/ai-writing-assistant/generate-illustration-prompt
 *    - Generates an illustration description/prompt from selected text
 *
 * 4. POST /api/projects/:projectId/ai-writing-assistant/lookup-fulltext
 *    - Looks up full text of an article by DOI/PMID
 */

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { pool } from "../pg.js";
import { getUserId } from "../utils/auth-helpers.js";
import { checkProjectAccessPool } from "../utils/project-access.js";
import { getUserApiKey } from "../utils/project-access.js";
import { createLogger } from "../utils/logger.js";
import { rateLimits } from "../plugins/rate-limit.js";
import { metrics } from "../plugins/metrics.js";
import { ExternalServiceError } from "../utils/typed-errors.js";
import { isStorageConfigured } from "../lib/storage.js";
import {
  IllustrationPipelineError,
  runIllustrationPipeline,
} from "../services/ai-illustration-pipeline.js";
import {
  IllustrationPersistenceError,
  persistGeneratedIllustrationAsset,
} from "../services/illustration-asset-storage.js";

const log = createLogger("ai-writing-assistant");
const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_PRIMARY_MODEL = "openai/gpt-4o-mini";
const OPENROUTER_FALLBACK_MODEL = "google/gemini-2.0-flash-001";

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type PmcIdLookupResponse = {
  records?: Array<{
    pmcid?: string;
  }>;
};

type UnpaywallResponse = {
  best_oa_location?: {
    url_for_pdf?: string;
    url?: string;
  };
};

// ===== Schemas =====

const ImproveTextBodySchema = z.object({
  selectedText: z.string().min(1).max(50000),
  context: z.string().max(100000).optional(), // surrounding text for context
  documentTitle: z.string().max(500).optional(),
  mode: z.enum(["academic", "academic_with_sources"]).default("academic"),
  citationDois: z.array(z.string()).optional(), // DOIs found in selected text
  fullTextSnippets: z
    .array(
      z.object({
        doi: z.string(),
        text: z.string().max(100000),
      }),
    )
    .optional(), // user-provided full text snippets
});

const GenerateTableBodySchema = z.object({
  selectedText: z.string().min(1).max(50000),
  tableType: z.enum(["comparison", "summary", "data", "auto"]).default("auto"),
  documentTitle: z.string().max(500).optional(),
});

const GenerateIllustrationBodySchema = z.object({
  selectedText: z.string().min(1).max(50000),
  illustrationType: z
    .enum(["diagram", "flowchart", "schema", "infographic", "auto"])
    .default("auto"),
  documentTitle: z.string().max(500).optional(),
});

const LookupFulltextBodySchema = z.object({
  doi: z.string().optional(),
  pmid: z.string().optional(),
});

// ===== Helper: Call OpenAI-compatible API =====

async function callLLM(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 4096;
  const models = [OPENROUTER_PRIMARY_MODEL, OPENROUTER_FALLBACK_MODEL];
  const errors: string[] = [];

  for (const model of models) {
    try {
      const response = await fetch(OPENROUTER_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://mdsystem.app",
          "X-Title": "MDsystem Writing Assistant",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const shortError = `model=${model} status=${response.status} err=${errorText.slice(0, 200)}`;
        errors.push(shortError);

        // Invalid key/permissions won't be fixed by model fallback.
        if (response.status === 401 || response.status === 403) {
          break;
        }
        continue;
      }

      const data = (await response.json()) as OpenRouterResponse;
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        return content;
      }

      errors.push(`model=${model} empty-content`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`model=${model} fetch-error=${msg.slice(0, 200)}`);
    }
  }

  log.error("LLM API request failed for all models", undefined, {
    errors: errors.join(" | "),
  });
  throw new ExternalServiceError(
    "openrouter",
    `LLM API error: ${errors[0] || "unknown error"}`,
  );
}

// ===== Helper: Extract DOIs from text =====

function extractDOIs(text: string): string[] {
  const doiRegex = /\b(10\.\d{4,}(?:\.\d+)*\/\S+?)(?=[,.\s;)\]>]|$)/gi;
  const matches = text.match(doiRegex);
  if (!matches) return [];
  // Deduplicate
  return [...new Set(matches.map((d) => d.trim()))];
}

// ===== Helper: Lookup article by DOI in database =====

async function lookupArticleByDoi(
  projectId: string,
  doi: string,
): Promise<{
  title: string | null;
  abstract: string | null;
  authors: string[] | null;
  year: number | null;
  journal: string | null;
} | null> {
  const res = await pool.query(
    `SELECT a.title_en, a.abstract_en, a.authors, a.year, a.journal
     FROM articles a
     JOIN project_articles pa ON pa.article_id = a.id
     WHERE pa.project_id = $1 AND a.doi = $2
     LIMIT 1`,
    [projectId, doi],
  );
  if (res.rowCount === 0) return null;
  const row = res.rows[0];
  return {
    title: row.title_en,
    abstract: row.abstract_en,
    authors: row.authors,
    year: row.year,
    journal: row.journal,
  };
}

async function lookupArticleByPmid(
  projectId: string,
  pmid: string,
): Promise<{
  title: string | null;
  abstract: string | null;
  authors: string[] | null;
  year: number | null;
  journal: string | null;
  doi: string | null;
} | null> {
  const res = await pool.query(
    `SELECT a.title_en, a.abstract_en, a.authors, a.year, a.journal, a.doi
     FROM articles a
     JOIN project_articles pa ON pa.article_id = a.id
     WHERE pa.project_id = $1 AND a.pmid = $2
     LIMIT 1`,
    [projectId, pmid],
  );
  if (res.rowCount === 0) return null;
  const row = res.rows[0];
  return {
    title: row.title_en,
    abstract: row.abstract_en,
    authors: row.authors,
    year: row.year,
    journal: row.journal,
    doi: row.doi,
  };
}

// ===== Helper: Try to find full text via PubMed/PMC =====

async function tryFindFullTextByDoi(
  doi: string,
): Promise<{ found: boolean; url?: string; snippet?: string }> {
  try {
    // Try PubMed Central API to find full text link
    const searchUrl = `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=${encodeURIComponent(doi)}&format=json`;
    const response = await fetch(searchUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { found: false };

    const data = (await response.json()) as PmcIdLookupResponse;
    const record = data?.records?.[0];
    if (record?.pmcid) {
      // Found PMC ID - construct full text URL
      const pmcUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/${record.pmcid}/`;
      return { found: true, url: pmcUrl };
    }

    // Try unpaywall for open access
    const unpaywallUrl = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=thesis-api@example.com`;
    const uwResponse = await fetch(unpaywallUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (uwResponse.ok) {
      const uwData = (await uwResponse.json()) as UnpaywallResponse;
      if (uwData?.best_oa_location?.url_for_pdf) {
        return { found: true, url: uwData.best_oa_location.url_for_pdf };
      }
      if (uwData?.best_oa_location?.url) {
        return { found: true, url: uwData.best_oa_location.url };
      }
    }

    return { found: false };
  } catch (error) {
    log.warn("Failed to lookup full text", {
      doi,
      error: error instanceof Error ? error.message : String(error),
    });
    return { found: false };
  }
}

async function tryFindFullTextByPmid(
  pmid: string,
): Promise<{ found: boolean; url?: string }> {
  try {
    const idConvUrl = `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=${encodeURIComponent(pmid)}&format=json`;
    const response = await fetch(idConvUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { found: false };

    const data = (await response.json()) as PmcIdLookupResponse;
    const record = data?.records?.[0];
    if (record?.pmcid) {
      return {
        found: true,
        url: `https://www.ncbi.nlm.nih.gov/pmc/articles/${record.pmcid}/`,
      };
    }

    return { found: false };
  } catch (error) {
    log.warn("Failed to lookup full text by PMID", {
      pmid,
      error: error instanceof Error ? error.message : String(error),
    });
    return { found: false };
  }
}

// ===== Prompts =====

function buildAcademicImprovementPrompt(
  selectedText: string,
  context?: string,
  documentTitle?: string,
  sourceInfo?: string,
): string {
  return `Ты - профессиональный редактор научных текстов. Твоя задача - улучшить выделенный фрагмент текста, сделав его более академичным, точным и грамотным.

${documentTitle ? `Название документа: "${documentTitle}"` : ""}
${context ? `\nКонтекст (окружающий текст):\n---\n${context}\n---\n` : ""}
${sourceInfo ? `\nИнформация из оригинальных источников:\n---\n${sourceInfo}\n---\n` : ""}

ВЫДЕЛЕННЫЙ ФРАГМЕНТ ДЛЯ УЛУЧШЕНИЯ:
---
${selectedText}
---

ПРАВИЛА:
1. Предложи РОВНО 2 варианта улучшения текста
2. Первый вариант - минимальная правка (сохраняя структуру, улучшая формулировки)
3. Второй вариант - более глубокая переработка (может менять структуру предложений)
4. Сохраняй все ссылки на источники [n] и цитаты
5. Не добавляй новой информации, которой нет в оригинале
6. Используй научный стиль: пассивный залог, терминологию, чёткие формулировки
7. Сохраняй язык оригинала (русский или английский)
${sourceInfo ? "8. Если есть информация из оригинальных источников - проверяй и корректируй фактические утверждения на основании первоисточников" : ""}

ФОРМАТ ОТВЕТА (строго JSON):
{
  "variant1": {
    "text": "Улучшенный текст (вариант 1 - минимальная правка)",
    "changes": "Краткое описание изменений"
  },
  "variant2": {
    "text": "Улучшенный текст (вариант 2 - глубокая переработка)",
    "changes": "Краткое описание изменений"
  },
  "notes": "Общие замечания по тексту (если есть)"
}

ВАЖНО: Возвращай ТОЛЬКО valid JSON, без markdown-обёрток.`;
}

function buildTableGenerationPrompt(
  selectedText: string,
  tableType: string,
  documentTitle?: string,
): string {
  return `Ты - помощник для научных исследований. На основе выделенного текста создай структурированную таблицу.

${documentTitle ? `Название документа: "${documentTitle}"` : ""}

ВЫДЕЛЕННЫЙ ТЕКСТ:
---
${selectedText}
---

${tableType !== "auto" ? `Тип таблицы: ${tableType}` : "Определи оптимальный тип таблицы автоматически."}

ПРАВИЛА:
1. Извлеки данные из текста и организуй их в таблицу
2. Заголовки должны быть информативными
3. Данные должны точно соответствовать тексту
4. Если в тексте есть числовые данные - сохрани их точно
5. Предложи название таблицы
6. Если данных достаточно для графика - предложи тип графика

ФОРМАТ ОТВЕТА (строго JSON):
{
  "title": "Название таблицы",
  "description": "Описание содержимого таблицы",
  "headers": ["Заголовок 1", "Заголовок 2", "Заголовок 3"],
  "rows": [
    ["Данные 1.1", "Данные 1.2", "Данные 1.3"],
    ["Данные 2.1", "Данные 2.2", "Данные 2.3"]
  ],
  "suggestedChartType": "bar|line|pie|scatter|none",
  "chartTitle": "Название графика (если применимо)",
  "notes": "Замечания (если есть)"
}

ВАЖНО: Возвращай ТОЛЬКО valid JSON, без markdown-обёрток.`;
}

function buildIllustrationPrompt(
  selectedText: string,
  illustrationType: string,
  documentTitle?: string,
): string {
  return `Ты - помощник для создания научных иллюстраций. На основе выделенного текста создай детальное описание иллюстрации в формате SVG-схемы.

${documentTitle ? `Название документа: "${documentTitle}"` : ""}

ВЫДЕЛЕННЫЙ ТЕКСТ:
---
${selectedText}
---

${illustrationType !== "auto" ? `Тип иллюстрации: ${illustrationType}` : "Определи оптимальный тип иллюстрации автоматически."}

ПРАВИЛА:
1. Создай SVG-код иллюстрации на основе текста
2. Используй простой, чистый научный стиль
3. Размер SVG: 800x600 пикселей
4. Цветовая схема: профессиональная (синий, серый, белый)
5. Добавь подписи на русском языке
6. Для клеток, органов и биологических объектов используй стандартные научные обозначения
7. Иллюстрация должна быть информативной и понятной

ФОРМАТ ОТВЕТА (строго JSON):
{
  "title": "Название иллюстрации",
  "description": "Описание иллюстрации",
  "type": "diagram|flowchart|schema|infographic",
  "svgCode": "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'>...</svg>",
  "figureCaption": "Подпись к рисунку для документа",
  "notes": "Замечания (если есть)"
}

ВАЖНО: Возвращай ТОЛЬКО valid JSON, без markdown-обёрток. SVG должен быть валидным.`;
}

// ===== Routes =====

const aiWritingAssistantRoutes: FastifyPluginAsync = async (fastify) => {
  // ==============================
  // POST /api/projects/:projectId/ai-writing-assistant/improve
  // ==============================
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof ImproveTextBodySchema>;
  }>(
    "/projects/:projectId/ai-writing-assistant/improve",
    { preHandler: [rateLimits.ai, fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { projectId } = request.params;

      // Check project access
      const access = await checkProjectAccessPool(projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      // Parse body
      const parsed = ImproveTextBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          details: parsed.error.issues,
        });
      }

      const {
        selectedText,
        context,
        documentTitle,
        mode,
        citationDois,
        fullTextSnippets,
      } = parsed.data;

      // Get user's OpenRouter API key
      const apiKey = await getUserApiKey(userId, "openrouter");
      if (!apiKey) {
        return reply.code(400).send({
          error:
            "OpenRouter API key not configured. Add it in Settings > API Keys.",
        });
      }

      try {
        let sourceInfo = "";

        // If mode is academic_with_sources, look up article information
        if (mode === "academic_with_sources") {
          // Extract DOIs from text if not provided
          const dois =
            citationDois && citationDois.length > 0
              ? citationDois
              : extractDOIs(selectedText);

          if (dois.length > 0) {
            const sourceInfoParts: string[] = [];

            for (const doi of dois.slice(0, 5)) {
              // Limit to 5 DOIs
              // First check user-provided full text snippets
              const userSnippet = fullTextSnippets?.find((s) => s.doi === doi);
              if (userSnippet) {
                sourceInfoParts.push(
                  `[DOI: ${doi}] (предоставлено пользователем):\n${userSnippet.text.slice(0, 5000)}`,
                );
                continue;
              }

              // Look up in project articles
              const article = await lookupArticleByDoi(projectId, doi);
              if (article) {
                const parts = [];
                if (article.title) parts.push(`Название: ${article.title}`);
                if (article.abstract)
                  parts.push(`Аннотация: ${article.abstract.slice(0, 2000)}`);
                if (article.authors)
                  parts.push(`Авторы: ${article.authors.join(", ")}`);
                if (article.year) parts.push(`Год: ${article.year}`);
                if (article.journal) parts.push(`Журнал: ${article.journal}`);
                sourceInfoParts.push(`[DOI: ${doi}]:\n${parts.join("\n")}`);
              }
            }

            if (sourceInfoParts.length > 0) {
              sourceInfo = sourceInfoParts.join("\n\n");
            }
          }
        }

        // Build prompt and call LLM
        const systemPrompt = buildAcademicImprovementPrompt(
          selectedText,
          context,
          documentTitle,
          sourceInfo || undefined,
        );

        const llmResponse = await callLLM(
          apiKey,
          systemPrompt,
          `Улучши этот текст:\n\n${selectedText}`,
          { temperature: 0.7, maxTokens: 4096 },
        );

        // Parse LLM response
        let result;
        try {
          // Remove possible markdown wrappers
          let cleanResponse = llmResponse.trim();
          if (cleanResponse.startsWith("```json")) {
            cleanResponse = cleanResponse.slice(7);
          }
          if (cleanResponse.startsWith("```")) {
            cleanResponse = cleanResponse.slice(3);
          }
          if (cleanResponse.endsWith("```")) {
            cleanResponse = cleanResponse.slice(0, -3);
          }
          result = JSON.parse(cleanResponse.trim());
        } catch (error) {
          log.warn("Failed to parse LLM response as JSON", {
            response: llmResponse.slice(0, 500),
            error: error instanceof Error ? error.message : String(error),
          });
          // Fallback: treat as single variant
          result = {
            variant1: {
              text: llmResponse,
              changes: "Ответ AI не удалось структурировать",
            },
            variant2: {
              text: selectedText,
              changes: "Оригинальный текст (ошибка парсинга)",
            },
          };
        }

        // Check DOIs for full text availability
        const doiFullTextStatus: Array<{
          doi: string;
          fullTextFound: boolean;
          fullTextUrl?: string;
        }> = [];

        if (mode === "academic_with_sources") {
          const dois =
            citationDois && citationDois.length > 0
              ? citationDois
              : extractDOIs(selectedText);
          for (const doi of dois.slice(0, 5)) {
            const hasUserSnippet = fullTextSnippets?.some((s) => s.doi === doi);
            if (!hasUserSnippet) {
              const ftResult = await tryFindFullTextByDoi(doi);
              doiFullTextStatus.push({
                doi,
                fullTextFound: ftResult.found,
                fullTextUrl: ftResult.url,
              });
            }
          }
        }

        return reply.send({
          ok: true,
          variant1: result.variant1,
          variant2: result.variant2,
          notes: result.notes || null,
          doiFullTextStatus:
            doiFullTextStatus.length > 0 ? doiFullTextStatus : undefined,
          mode,
        });
      } catch (err) {
        log.error("AI text improvement failed", err, { projectId });
        return reply.code(500).send({
          error: "AI text improvement failed",
        });
      }
    },
  );

  // ==============================
  // POST /api/projects/:projectId/ai-writing-assistant/generate-table
  // ==============================
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof GenerateTableBodySchema>;
  }>(
    "/projects/:projectId/ai-writing-assistant/generate-table",
    { preHandler: [rateLimits.ai, fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { projectId } = request.params;

      const access = await checkProjectAccessPool(projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      const parsed = GenerateTableBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          details: parsed.error.issues,
        });
      }

      const { selectedText, tableType, documentTitle } = parsed.data;

      const apiKey = await getUserApiKey(userId, "openrouter");
      if (!apiKey) {
        return reply.code(400).send({
          error:
            "OpenRouter API key not configured. Add it in Settings > API Keys.",
        });
      }

      try {
        const systemPrompt = buildTableGenerationPrompt(
          selectedText,
          tableType,
          documentTitle,
        );

        const llmResponse = await callLLM(
          apiKey,
          systemPrompt,
          `Создай таблицу на основе этого текста:\n\n${selectedText}`,
          { temperature: 0.5, maxTokens: 4096 },
        );

        let result;
        try {
          let cleanResponse = llmResponse.trim();
          if (cleanResponse.startsWith("```json")) {
            cleanResponse = cleanResponse.slice(7);
          }
          if (cleanResponse.startsWith("```")) {
            cleanResponse = cleanResponse.slice(3);
          }
          if (cleanResponse.endsWith("```")) {
            cleanResponse = cleanResponse.slice(0, -3);
          }
          result = JSON.parse(cleanResponse.trim());
        } catch (error) {
          log.warn("Failed to parse AI table JSON response", {
            projectId,
            error: error instanceof Error ? error.message : String(error),
          });
          return reply.code(500).send({
            error: "Failed to parse AI response. Please try again.",
          });
        }

        return reply.send({
          ok: true,
          title: result.title,
          description: result.description,
          headers: result.headers,
          rows: result.rows,
          suggestedChartType: result.suggestedChartType || "none",
          chartTitle: result.chartTitle || null,
          notes: result.notes || null,
        });
      } catch (err) {
        log.error("AI table generation failed", err, { projectId });
        return reply.code(500).send({
          error: "AI table generation failed",
        });
      }
    },
  );

  // ==============================
  // POST /api/projects/:projectId/ai-writing-assistant/generate-illustration
  // ==============================
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof GenerateIllustrationBodySchema>;
  }>(
    "/projects/:projectId/ai-writing-assistant/generate-illustration",
    { preHandler: [rateLimits.ai, fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { projectId } = request.params;

      const access = await checkProjectAccessPool(projectId, userId, true);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      const parsed = GenerateIllustrationBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          details: parsed.error.issues,
        });
      }

      const { selectedText, illustrationType, documentTitle } = parsed.data;

      const apiKey = await getUserApiKey(userId, "openrouter");
      if (!apiKey) {
        return reply.code(400).send({
          error:
            "OpenRouter API key not configured. Add it in Settings > API Keys.",
        });
      }

      if (!isStorageConfigured()) {
        return reply.code(503).send({
          error:
            "Illustration storage is not configured. Please contact administrator.",
        });
      }

      const startedAt = performance.now();
      let pipelineMode: "baseline" | "agentic" = env
        .AI_ILLUSTRATION_AGENTIC_ENABLED
        ? "agentic"
        : "baseline";
      let outcome: "success" | "error" | "invalid_response" = "error";

      try {
        const pipeline = await runIllustrationPipeline({
          input: {
            selectedText,
            illustrationType,
            documentTitle,
          },
          llmCall: ({ systemPrompt, userPrompt, temperature, maxTokens }) =>
            callLLM(apiKey, systemPrompt, userPrompt, {
              temperature,
              maxTokens,
            }),
          options: {
            agenticEnabled: env.AI_ILLUSTRATION_AGENTIC_ENABLED,
            maxCriticIterations: env.AI_ILLUSTRATION_AGENTIC_MAX_CRITIC_ROUNDS,
            buildIllustrationPrompt,
          },
        });

        pipelineMode = pipeline.mode;
        if (pipeline.usedFallback) {
          metrics.aiIllustrationFallbackTotal.inc({
            from_mode: "agentic",
            to_mode: "baseline",
          });
          log.warn("AI illustration pipeline fallback triggered", {
            projectId,
            reason: pipeline.fallbackReason,
          });
        }

        const persisted = await persistGeneratedIllustrationAsset({
          projectId,
          userId,
          title: pipeline.result.title,
          description: pipeline.result.description,
          svgCode: pipeline.result.svgCode,
        });

        outcome = "success";
        return reply.send({
          ok: true,
          title: pipeline.result.title,
          description: pipeline.result.description,
          type: pipeline.result.type,
          svgCode: persisted.sanitizedSvg,
          figureCaption: pipeline.result.figureCaption || null,
          notes: pipeline.result.notes || null,
          projectFile: persisted.projectFile,
          pipeline: {
            mode: pipeline.mode,
            usedFallback: pipeline.usedFallback,
            criticIterations: pipeline.criticIterations,
          },
        });
      } catch (err) {
        if (err instanceof IllustrationPipelineError) {
          outcome = "invalid_response";
          metrics.aiIllustrationParseFailuresTotal.inc({
            failure_type: err.code,
          });
          log.warn("AI illustration response failed strict validation", {
            projectId,
            code: err.code,
            details: err.details,
          });

          return reply.code(502).send({
            error: "Invalid AI illustration response format",
            code: err.code,
          });
        }

        if (err instanceof IllustrationPersistenceError) {
          log.warn("Failed to persist generated illustration", {
            projectId,
            code: err.code,
            details: err.details,
          });

          if (err.code === "STORAGE_NOT_CONFIGURED") {
            return reply.code(503).send({
              error:
                "Illustration storage is not configured. Please contact administrator.",
            });
          }

          if (err.code === "SVG_SANITIZATION_FAILED") {
            return reply.code(422).send({
              error:
                "Generated illustration failed security validation. Please try again.",
            });
          }

          return reply.code(500).send({
            error: "Failed to persist generated illustration",
          });
        }

        log.error("AI illustration generation failed", err, { projectId });
        return reply.code(500).send({
          error: "AI illustration generation failed",
        });
      } finally {
        const durationSeconds = (performance.now() - startedAt) / 1000;
        metrics.aiIllustrationPipelineDurationSeconds.observe(
          { mode: pipelineMode, outcome },
          durationSeconds,
        );
        metrics.aiIllustrationRequestsTotal.inc({
          mode: pipelineMode,
          outcome,
        });
      }
    },
  );

  // ==============================
  // POST /api/projects/:projectId/ai-writing-assistant/lookup-fulltext
  // ==============================
  fastify.post<{
    Params: { projectId: string };
    Body: z.infer<typeof LookupFulltextBodySchema>;
  }>(
    "/projects/:projectId/ai-writing-assistant/lookup-fulltext",
    { preHandler: [rateLimits.ai, fastify.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { projectId } = request.params;

      const access = await checkProjectAccessPool(projectId, userId);
      if (!access.ok) {
        return reply.code(403).send({ error: "Access denied" });
      }

      const parsed = LookupFulltextBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          details: parsed.error.issues,
        });
      }

      const { doi, pmid } = parsed.data;
      if (!doi && !pmid) {
        return reply
          .code(400)
          .send({ error: "Either doi or pmid is required" });
      }

      try {
        let targetDoi = doi || "";
        let article:
          | Awaited<ReturnType<typeof lookupArticleByDoi>>
          | Awaited<ReturnType<typeof lookupArticleByPmid>>
          | null = null;

        // Look up in project database
        if (targetDoi) {
          article = await lookupArticleByDoi(projectId, targetDoi);
        } else if (pmid) {
          const byPmid = await lookupArticleByPmid(projectId, pmid);
          article = byPmid;
          if (byPmid?.doi) {
            targetDoi = byPmid.doi;
          }
        }

        // Try to find full text URL
        const fullTextResult = targetDoi
          ? await tryFindFullTextByDoi(targetDoi)
          : pmid
            ? await tryFindFullTextByPmid(pmid)
            : { found: false };

        return reply.send({
          ok: true,
          doi: targetDoi || null,
          pmid: pmid || null,
          articleInProject: !!article,
          articleInfo: article || null,
          fullTextFound: fullTextResult.found,
          fullTextUrl: fullTextResult.url || null,
        });
      } catch (err) {
        log.error("Full text lookup failed", err, {
          doi: doi || "",
          pmid: pmid || "",
        });
        return reply.code(500).send({
          error: "Full text lookup failed",
        });
      }
    },
  );
};

export default aiWritingAssistantRoutes;
