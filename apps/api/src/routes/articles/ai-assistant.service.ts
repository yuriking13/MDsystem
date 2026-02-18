import { ExternalServiceError } from "../../utils/typed-errors.js";

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type OpenRouterCompletionOptions = {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  referer?: string;
  signalTimeoutMs?: number;
};

export async function requestOpenRouterCompletion(
  options: OpenRouterCompletionOptions,
): Promise<string> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
        "HTTP-Referer": options.referer || "https://mdsystem.app",
      },
      body: JSON.stringify({
        model: options.model || "anthropic/claude-sonnet-4",
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt },
        ],
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 4000,
      }),
      signal: AbortSignal.timeout(options.signalTimeoutMs ?? 45_000),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new ExternalServiceError(
      "openrouter",
      `OpenRouter error ${response.status}: ${errorText.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as OpenRouterResponse;
  return data.choices?.[0]?.message?.content || "";
}

export function parseFirstJsonObject<T>(
  content: string,
  fallback: T,
  onParseError?: (error: unknown) => void,
): T {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallback;
    }
    return JSON.parse(jsonMatch[0]) as T;
  } catch (error) {
    onParseError?.(error);
    return fallback;
  }
}
