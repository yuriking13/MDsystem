import { z } from "zod";
import { createLogger } from "../utils/logger.js";

const log = createLogger("ai-illustration-pipeline");

export const IllustrationTypeSchema = z.enum([
  "diagram",
  "flowchart",
  "schema",
  "infographic",
]);

export const IllustrationLlmResponseSchema = z
  .object({
    title: z.string().min(1).max(500),
    description: z.string().min(1).max(4000),
    type: IllustrationTypeSchema,
    svgCode: z.string().min(1).max(200000),
    figureCaption: z.string().max(2000).nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
  })
  .strict();

const PlannerResponseSchema = z
  .object({
    enhancedDescription: z.string().min(20).max(12000),
  })
  .strict();

const CriticResponseSchema = z
  .object({
    needsRevision: z.boolean(),
    issues: z.array(z.string().min(1).max(500)).max(5).default([]),
  })
  .strict();

export type IllustrationLlmResponse = z.infer<
  typeof IllustrationLlmResponseSchema
>;
export type IllustrationPipelineMode = "baseline" | "agentic";

export type IllustrationPipelineInput = {
  selectedText: string;
  illustrationType: "diagram" | "flowchart" | "schema" | "infographic" | "auto";
  documentTitle?: string;
};

export type RetrievedIllustrationReference = {
  id: string;
  snippet: string;
  source?: string;
  score?: number;
};

// Phase-2 extension point: retriever for internal references/examples.
export interface IllustrationRetriever {
  retrieve(
    input: IllustrationPipelineInput,
  ): Promise<RetrievedIllustrationReference[]>;
}

export class NoopIllustrationRetriever implements IllustrationRetriever {
  async retrieve(): Promise<RetrievedIllustrationReference[]> {
    return [];
  }
}

export type CodeFirstRenderInput = {
  selectedText: string;
  illustrationType: IllustrationPipelineInput["illustrationType"];
  documentTitle?: string;
};

// Phase-2 extension point: code-first path for statistical charts.
export interface CodeFirstPlotRenderer {
  canRender(input: CodeFirstRenderInput): boolean;
  render(input: CodeFirstRenderInput): Promise<IllustrationLlmResponse>;
}

export class NoopCodeFirstPlotRenderer implements CodeFirstPlotRenderer {
  canRender(): boolean {
    return false;
  }

  async render(): Promise<IllustrationLlmResponse> {
    throw new Error("Code-first rendering is not implemented");
  }
}

export class IllustrationPipelineError extends Error {
  constructor(
    public readonly code:
      | "AI_RESPONSE_EMPTY"
      | "AI_RESPONSE_PARSE_ERROR"
      | "AI_RESPONSE_SCHEMA_ERROR",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "IllustrationPipelineError";
  }
}

export type IllustrationLlmCall = (params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}) => Promise<string>;

export type IllustrationPipelineResult = {
  result: IllustrationLlmResponse;
  mode: IllustrationPipelineMode;
  usedFallback: boolean;
  criticIterations: number;
  fallbackReason?: string;
};

type PipelineOptions = {
  agenticEnabled: boolean;
  maxCriticIterations: number;
  retriever?: IllustrationRetriever;
  codeFirstRenderer?: CodeFirstPlotRenderer;
  buildIllustrationPrompt: (
    selectedText: string,
    illustrationType: string,
    documentTitle?: string,
  ) => string;
};

type GenerationContext = {
  input: IllustrationPipelineInput;
  references: RetrievedIllustrationReference[];
  buildIllustrationPrompt: PipelineOptions["buildIllustrationPrompt"];
};

function unwrapMarkdownJson(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

function parseJsonObject(raw: string): unknown {
  const cleaned = unwrapMarkdownJson(raw);
  return JSON.parse(cleaned);
}

function parseAndValidate<T>(raw: string, schema: z.ZodType<T>): T {
  if (!raw || raw.trim().length === 0) {
    throw new IllustrationPipelineError(
      "AI_RESPONSE_EMPTY",
      "LLM returned an empty response",
    );
  }

  let parsed: unknown;
  try {
    parsed = parseJsonObject(raw);
  } catch (error) {
    throw new IllustrationPipelineError(
      "AI_RESPONSE_PARSE_ERROR",
      "Failed to parse LLM response as JSON",
      error instanceof Error ? error.message : String(error),
    );
  }

  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    throw new IllustrationPipelineError(
      "AI_RESPONSE_SCHEMA_ERROR",
      "LLM response JSON does not match expected schema",
      validated.error.issues,
    );
  }

  return validated.data;
}

function normalizeNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeResponse(
  payload: IllustrationLlmResponse,
): IllustrationLlmResponse {
  return {
    ...payload,
    figureCaption: normalizeNullable(payload.figureCaption),
    notes: normalizeNullable(payload.notes),
  };
}

function serializeReferences(
  references: RetrievedIllustrationReference[],
): string | null {
  if (references.length === 0) {
    return null;
  }

  return references
    .slice(0, 5)
    .map((ref, index) => {
      const scorePart =
        typeof ref.score === "number" ? ` (score=${ref.score.toFixed(3)})` : "";
      return `${index + 1}. [${ref.id}]${scorePart}\n${ref.snippet}`;
    })
    .join("\n\n");
}

function buildGenerationUserPrompt(
  selectedText: string,
  references: RetrievedIllustrationReference[],
): string {
  const refs = serializeReferences(references);
  if (!refs) {
    return `Создай иллюстрацию на основе этого текста:\n\n${selectedText}`;
  }

  return [
    "Создай иллюстрацию на основе этого текста:",
    "",
    selectedText,
    "",
    "Дополнительные референсы из внутреннего корпуса (используй при необходимости):",
    refs,
  ].join("\n");
}

async function runBaselineGeneration(
  llmCall: IllustrationLlmCall,
  context: GenerationContext,
  selectedTextOverride?: string,
): Promise<IllustrationLlmResponse> {
  const selectedText = selectedTextOverride ?? context.input.selectedText;
  const systemPrompt = context.buildIllustrationPrompt(
    selectedText,
    context.input.illustrationType,
    context.input.documentTitle,
  );

  const llmRaw = await llmCall({
    systemPrompt,
    userPrompt: buildGenerationUserPrompt(selectedText, context.references),
    temperature: 0.6,
    maxTokens: 8192,
  });

  return normalizeResponse(
    parseAndValidate(llmRaw, IllustrationLlmResponseSchema),
  );
}

async function runPlanner(
  llmCall: IllustrationLlmCall,
  input: IllustrationPipelineInput,
): Promise<string> {
  const plannerRaw = await llmCall({
    systemPrompt:
      "Ты planner-помощник по научным иллюстрациям. Улучши входное описание так, чтобы итоговая SVG-иллюстрация была ясной, структурированной и без лишних деталей. Возвращай только JSON.",
    userPrompt: [
      `Исходный фрагмент:`,
      input.selectedText,
      "",
      `Целевой тип иллюстрации: ${input.illustrationType}`,
      input.documentTitle ? `Название документа: ${input.documentTitle}` : "",
      "",
      'Ответь строго JSON: {"enhancedDescription":"..."}',
    ]
      .filter(Boolean)
      .join("\n"),
    temperature: 0.2,
    maxTokens: 700,
  });

  const planner = parseAndValidate(plannerRaw, PlannerResponseSchema);
  return planner.enhancedDescription;
}

async function runCritic(
  llmCall: IllustrationLlmCall,
  sourceText: string,
  candidate: IllustrationLlmResponse,
): Promise<z.infer<typeof CriticResponseSchema>> {
  const criticRaw = await llmCall({
    systemPrompt:
      "Ты critic-помощник по научным иллюстрациям. Проверяй соответствие исходному тексту, логическую целостность схемы, ясность подписей и отсутствие явных артефактов в SVG. Возвращай только JSON.",
    userPrompt: [
      `Исходный текст:`,
      sourceText,
      "",
      `Кандидат title: ${candidate.title}`,
      `Кандидат description: ${candidate.description}`,
      `Кандидат type: ${candidate.type}`,
      "",
      "SVG (обрезано до 6000 символов):",
      candidate.svgCode.slice(0, 6000),
      "",
      'Ответь строго JSON: {"needsRevision":boolean,"issues":["..."]}',
    ].join("\n"),
    temperature: 0.1,
    maxTokens: 700,
  });

  const critic = parseAndValidate(criticRaw, CriticResponseSchema);
  return {
    needsRevision: critic.needsRevision,
    issues: critic.issues ?? [],
  };
}

async function runRevision(
  llmCall: IllustrationLlmCall,
  context: GenerationContext,
  current: IllustrationLlmResponse,
  issues: string[],
): Promise<IllustrationLlmResponse> {
  const revisionRaw = await llmCall({
    systemPrompt: context.buildIllustrationPrompt(
      context.input.selectedText,
      context.input.illustrationType,
      context.input.documentTitle,
    ),
    userPrompt: [
      "Исправь иллюстрацию по замечаниям критика.",
      "",
      "Замечания:",
      ...issues.map((issue, index) => `${index + 1}. ${issue}`),
      "",
      "Текущая версия JSON:",
      JSON.stringify(current),
      "",
      "Верни полный исправленный JSON-ответ в том же формате.",
    ].join("\n"),
    temperature: 0.3,
    maxTokens: 8192,
  });

  return normalizeResponse(
    parseAndValidate(revisionRaw, IllustrationLlmResponseSchema),
  );
}

export async function runIllustrationPipeline(params: {
  input: IllustrationPipelineInput;
  llmCall: IllustrationLlmCall;
  options: PipelineOptions;
}): Promise<IllustrationPipelineResult> {
  const { input, llmCall, options } = params;

  const retriever = options.retriever ?? new NoopIllustrationRetriever();
  const codeFirstRenderer =
    options.codeFirstRenderer ?? new NoopCodeFirstPlotRenderer();
  const maxCriticIterations = Math.max(
    0,
    Math.min(options.maxCriticIterations, 2),
  );

  let references: RetrievedIllustrationReference[] = [];
  try {
    references = await retriever.retrieve(input);
  } catch (error) {
    log.warn("Retriever failed; continuing without references", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const codeFirstInput: CodeFirstRenderInput = {
    selectedText: input.selectedText,
    illustrationType: input.illustrationType,
    documentTitle: input.documentTitle,
  };

  if (codeFirstRenderer.canRender(codeFirstInput)) {
    try {
      const rendered = await codeFirstRenderer.render(codeFirstInput);
      const normalized = normalizeResponse(rendered);
      const validated = IllustrationLlmResponseSchema.parse(normalized);
      return {
        result: validated,
        mode: options.agenticEnabled ? "agentic" : "baseline",
        usedFallback: false,
        criticIterations: 0,
      };
    } catch (error) {
      log.warn("Code-first render failed; falling back to LLM generation", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const context: GenerationContext = {
    input,
    references,
    buildIllustrationPrompt: options.buildIllustrationPrompt,
  };

  if (!options.agenticEnabled) {
    return {
      result: await runBaselineGeneration(llmCall, context),
      mode: "baseline",
      usedFallback: false,
      criticIterations: 0,
    };
  }

  try {
    const plannedText = await runPlanner(llmCall, input);
    let current = await runBaselineGeneration(llmCall, context, plannedText);
    let criticIterations = 0;

    for (let iteration = 0; iteration < maxCriticIterations; iteration += 1) {
      const critic = await runCritic(llmCall, input.selectedText, current);
      if (!critic.needsRevision || critic.issues.length === 0) {
        break;
      }

      current = await runRevision(llmCall, context, current, critic.issues);
      criticIterations += 1;
    }

    return {
      result: current,
      mode: "agentic",
      usedFallback: false,
      criticIterations,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    log.warn("Agentic pipeline failed; using baseline fallback", { reason });

    const fallback = await runBaselineGeneration(llmCall, context);
    return {
      result: fallback,
      mode: "baseline",
      usedFallback: true,
      criticIterations: 0,
      fallbackReason: reason.slice(0, 300),
    };
  }
}
