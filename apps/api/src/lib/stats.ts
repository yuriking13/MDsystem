export type ExtractedStats = {
  pValues: Array<{ raw: string; operator?: string; value?: number }>;
  tTests: Array<{ raw: string; df?: number; value?: number }>;
  confidenceIntervals: Array<{ raw: string; level?: number; low?: number; high?: number }>;
  effects: Array<{ raw: string; type?: string; value?: number }>;
};

function toNumberSafe(x: string | undefined): number | undefined {
  if (!x) return undefined;
  const v = Number(x.replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
}

export function extractStats(text: string | undefined | null): ExtractedStats {
  const s = (text ?? '').replace(/\s+/g, ' ');
  const pValues: ExtractedStats['pValues'] = [];
  const tTests: ExtractedStats['tTests'] = [];
  const confidenceIntervals: ExtractedStats['confidenceIntervals'] = [];
  const effects: ExtractedStats['effects'] = [];

  // p < 0.05, p=0.001, P ≤ 0.01 etc.
  const pRe = /\b[pP]\s*([<=>≤≥])\s*(0\.\d+|\d+\.\d+|\d+e-\d+)\b/g;
  for (const m of s.matchAll(pRe)) {
    pValues.push({ raw: m[0], operator: m[1], value: toNumberSafe(m[2]) });
  }

  // t(df)=value
  const tRe = /\bt\s*\(\s*(\d+)\s*\)\s*=\s*(-?\d+(?:\.\d+)?)/g;
  for (const m of s.matchAll(tRe)) {
    tTests.push({ raw: m[0], df: Number(m[1]), value: toNumberSafe(m[2]) });
  }

  // 95% CI 1.2-2.3 or (95% CI, 1.2 to 2.3)
  const ciRe = /(\b(?:95%\s*CI|CI\s*95%)\b[^0-9]{0,10})(-?\d+(?:\.\d+)?)[\s–-]+(-?\d+(?:\.\d+)?)/gi;
  for (const m of s.matchAll(ciRe)) {
    confidenceIntervals.push({ raw: m[0], level: 95, low: toNumberSafe(m[2]), high: toNumberSafe(m[3]) });
  }

  // OR/RR/HR = value
  const effRe = /\b(OR|RR|HR)\s*(?:=|:)?\s*(-?\d+(?:\.\d+)?)/g;
  for (const m of s.matchAll(effRe)) {
    effects.push({ raw: m[0], type: m[1], value: toNumberSafe(m[2]) });
  }

  return { pValues, tTests, confidenceIntervals, effects };
}

export function hasAnyStats(stats: ExtractedStats): boolean {
  return stats.pValues.length + stats.tTests.length + stats.confidenceIntervals.length + stats.effects.length > 0;
}

/**
 * Вычисляет качество статистики на основе p-values
 * 3 = есть p < 0.001 (очень значимо)
 * 2 = есть p < 0.01 (значимо)
 * 1 = есть p < 0.05 (умеренно значимо)
 * 0 = нет значимых p-values
 */
export function calculateStatsQuality(stats: ExtractedStats): number {
  let quality = 0;
  
  for (const p of stats.pValues) {
    if (p.value !== undefined) {
      if (p.value < 0.001) {
        quality = Math.max(quality, 3);
      } else if (p.value < 0.01) {
        quality = Math.max(quality, 2);
      } else if (p.value < 0.05) {
        quality = Math.max(quality, 1);
      }
    } else if (p.operator && p.raw) {
      // Парсим из raw строки
      const raw = p.raw.toLowerCase();
      if (raw.includes('0.001') || raw.includes('0.0001')) {
        quality = Math.max(quality, 3);
      } else if (raw.includes('0.01')) {
        quality = Math.max(quality, 2);
      } else if (raw.includes('0.05')) {
        quality = Math.max(quality, 1);
      }
    }
  }
  
  // Бонус за наличие CI и эффектов
  if (stats.confidenceIntervals.length > 0 && quality > 0) {
    quality = Math.min(quality + 0.5, 3);
  }
  
  return Math.floor(quality);
}

// ============ AI-powered statistics detection ============

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

export type AIStatsResult = {
  hasStats: boolean;
  stats: Array<{
    text: string;
    type: 'p-value' | 'confidence-interval' | 'effect-size' | 'sample-size' | 'test-statistic' | 'other';
    significance?: 'high' | 'medium' | 'low' | 'not-significant';
  }>;
  summary?: string;
};

/**
 * Использует AI (OpenRouter) для детекции статистических данных в тексте
 * Более точно чем regex, особенно для сложных случаев
 */
export async function detectStatsWithAI(args: {
  text: string;
  openrouterKey: string;
  model?: string;
}): Promise<AIStatsResult> {
  const { text, openrouterKey, model = "google/gemini-2.0-flash-001" } = args;

  const prompt = `You are a scientific statistics expert. Analyze the following text and identify ALL statistical data.

TEXT:
${text}

Your task:
1. Find ALL statistical values including: p-values, confidence intervals, odds ratios (OR), risk ratios (RR), hazard ratios (HR), sample sizes (n=), t-tests, chi-square, F-statistics, correlation coefficients, standard deviations, means with errors, etc.
2. For each found statistic, identify its type and significance level.

Respond in JSON format:
{
  "hasStats": true/false,
  "stats": [
    {
      "text": "exact text from abstract containing the statistic",
      "type": "p-value|confidence-interval|effect-size|sample-size|test-statistic|other",
      "significance": "high|medium|low|not-significant"
    }
  ],
  "summary": "brief summary of statistical findings"
}

Rules for significance:
- high: p < 0.001 or very strong effects
- medium: p < 0.01 or moderate effects  
- low: p < 0.05 or weak effects
- not-significant: p ≥ 0.05 or descriptive stats only

IMPORTANT: Return ONLY valid JSON, no markdown or explanations.`;

  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterKey}`,
        "HTTP-Referer": "https://mdsystem.app",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${err.slice(0, 200)}`);
    }

    type OpenRouterResponse = {
      choices: Array<{ message: { content: string } }>;
    };
    const data = (await res.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { hasStats: false, stats: [] };
    }
    
    const result = JSON.parse(jsonMatch[0]) as AIStatsResult;
    return result;
  } catch (err) {
    console.error("AI stats detection error:", err);
    return { hasStats: false, stats: [] };
  }
}

/**
 * Комбинированная детекция: сначала regex, потом AI если нужно
 */
export async function detectStatsCombined(args: {
  text: string;
  openrouterKey?: string;
  useAI?: boolean;
}): Promise<{ hasStats: boolean; quality: number; stats: ExtractedStats; aiStats?: AIStatsResult }> {
  const { text, openrouterKey, useAI = true } = args;
  
  // Сначала regex
  const regexStats = extractStats(text);
  const hasRegexStats = hasAnyStats(regexStats);
  const quality = calculateStatsQuality(regexStats);
  
  // Если regex нашёл - возвращаем
  if (hasRegexStats || !useAI || !openrouterKey) {
    return { hasStats: hasRegexStats, quality, stats: regexStats };
  }
  
  // Если regex не нашёл - пробуем AI
  const aiStats = await detectStatsWithAI({ text, openrouterKey });
  
  return {
    hasStats: hasRegexStats || aiStats.hasStats,
    quality: aiStats.hasStats ? Math.max(quality, 1) : quality,
    stats: regexStats,
    aiStats,
  };
}
