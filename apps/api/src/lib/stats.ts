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

  const prompt = `You are a scientific statistics expert analyzing a medical research abstract.

TEXT:
${text}

TASK: Find ONLY inferential statistics that indicate statistical significance or effect sizes. 

INCLUDE (these are what we're looking for):
- P-values: "p < 0.05", "p = 0.001", "P < 0.001"
- Confidence intervals WITH effect measures: "OR = 1.30; 95% CI: 1.06-1.61", "HR 2.5 (1.2-4.8)"
- Effect sizes with CI: "RR = 0.75 (95% CI 0.6-0.9)"
- Test statistics with p-values: "χ² = 15.3, p < 0.01", "t(45) = 2.31, p = 0.025"
- Correlation with significance: "r = 0.45, p < 0.05"

EXCLUDE (do NOT mark these as significant statistics):
- Simple percentages: "15.9% of patients", "48.3% had diabetes" — these are DESCRIPTIVE, not inferential
- Sample sizes alone: "n = 895", "895 women" — unless paired with statistical test
- Means without comparison: "mean age 38.9 years", "average BMI 25.3"
- Prevalence rates: "prevalence of 30%", "48.3% had metabolic syndrome"
- Simple proportions or frequencies

CRITICAL RULES:
1. A percentage like "15.9%" is NOT a p-value! Only "p < 0.05" format indicates significance.
2. "significance" field should ONLY be "high/medium/low" if there's an ACTUAL p-value in the text
3. If no p-value is present, use "not-significant" for the significance field
4. For confidence intervals without explicit p-value, use "not-significant" unless effect clearly excludes null

Respond in JSON format:
{
  "hasStats": true/false,
  "stats": [
    {
      "text": "exact text fragment containing the statistic",
      "type": "p-value|confidence-interval|effect-size|sample-size|test-statistic|other",
      "significance": "high|medium|low|not-significant"
    }
  ],
  "summary": "brief summary"
}

Significance levels (ONLY for actual p-values):
- high: p < 0.001
- medium: p < 0.01  
- low: p < 0.05
- not-significant: p ≥ 0.05 OR no p-value present

Return ONLY valid JSON.`;

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
    
    const rawResult = JSON.parse(jsonMatch[0]) as AIStatsResult;
    
    // Post-process: validate significance levels
    // Only allow high/medium/low if the text actually contains a p-value pattern
    const pValuePattern = /[pP]\s*[<>=≤≥]\s*0[.,]\d+/;
    
    if (rawResult.stats) {
      rawResult.stats = rawResult.stats.map(stat => {
        // If marked as significant but no actual p-value in text, downgrade to not-significant
        if (stat.significance && stat.significance !== 'not-significant') {
          if (!pValuePattern.test(stat.text)) {
            // Check if it's a CI that excludes null (e.g., OR > 1 with CI not crossing 1)
            const ciExcludesNull = /(?:OR|RR|HR)\s*[=:]\s*(\d+[.,]\d*)[^0-9]*(?:95%?\s*CI|CI\s*95%?)[:\s]*\(?(\d+[.,]\d*)[\s–\-−—]+(\d+[.,]\d*)\)?/i;
            const ciMatch = stat.text.match(ciExcludesNull);
            
            if (ciMatch) {
              const low = parseFloat(ciMatch[2].replace(',', '.'));
              const high = parseFloat(ciMatch[3].replace(',', '.'));
              // If CI doesn't cross 1.0, it's statistically significant
              if (low > 1.0 || high < 1.0) {
                stat.significance = 'low'; // Conservative estimate without explicit p-value
              } else {
                stat.significance = 'not-significant';
              }
            } else {
              stat.significance = 'not-significant';
            }
          }
        }
        return stat;
      });
      
      // Filter out purely descriptive stats that slipped through
      rawResult.stats = rawResult.stats.filter(stat => {
        const statText = stat.text.toLowerCase();
        // Reject simple percentages without statistical context
        if (/^\d+[.,]\d*\s*%/.test(stat.text) && !pValuePattern.test(stat.text)) {
          // Check if it has statistical context
          if (!/(ci|or|rr|hr|odds|risk|hazard|interval)/i.test(statText)) {
            return false;
          }
        }
        return true;
      });
      
      rawResult.hasStats = rawResult.stats.length > 0;
    }
    
    return rawResult;
  } catch (err) {
    console.error("AI stats detection error:", err);
    return { hasStats: false, stats: [] };
  }
}

/**
 * Расширенная regex детекция для fallback режима
 * Используется когда AI недоступен
 */
export function extractStatsEnhanced(text: string | undefined | null): ExtractedStats & { additionalFindings: string[] } {
  const baseStats = extractStats(text);
  const additionalFindings: string[] = [];
  const s = (text ?? '').replace(/\s+/g, ' ');

  // Additional patterns for better coverage when AI is unavailable
  
  // F-statistic: F(1, 234) = 5.67, p < 0.05
  const fRe = /\bF\s*\(\s*\d+\s*,\s*\d+\s*\)\s*=\s*[\d.]+/gi;
  for (const m of s.matchAll(fRe)) {
    additionalFindings.push(m[0]);
  }

  // Chi-square: χ² = 15.3, chi-square = 12.4
  const chiRe = /(?:χ²|chi-?square)\s*[=:]\s*[\d.]+/gi;
  for (const m of s.matchAll(chiRe)) {
    additionalFindings.push(m[0]);
  }

  // Correlation: r = 0.45, r² = 0.20
  const corrRe = /\br²?\s*=\s*-?[\d.]+/gi;
  for (const m of s.matchAll(corrRe)) {
    additionalFindings.push(m[0]);
  }

  // Sample size in results context: n = 150, N = 1234
  const nRe = /\b[nN]\s*=\s*\d+/g;
  for (const m of s.matchAll(nRe)) {
    additionalFindings.push(m[0]);
  }

  // Mean ± SD: 12.5 ± 3.2
  const meanSdRe = /[\d.]+\s*[±]\s*[\d.]+/g;
  for (const m of s.matchAll(meanSdRe)) {
    additionalFindings.push(m[0]);
  }

  // Statistical significance phrases
  const sigPhrases = [
    /statistically\s+significant/gi,
    /significantly\s+(?:higher|lower|greater|reduced|increased|decreased)/gi,
    /no\s+significant\s+difference/gi,
  ];
  for (const re of sigPhrases) {
    for (const m of s.matchAll(re)) {
      additionalFindings.push(m[0]);
    }
  }

  return { ...baseStats, additionalFindings };
}

/**
 * Комбинированная детекция: сначала regex, потом AI если нужно
 * С graceful degradation при недоступности AI
 */
export async function detectStatsCombined(args: {
  text: string;
  openrouterKey?: string;
  useAI?: boolean;
}): Promise<{ hasStats: boolean; quality: number; stats: ExtractedStats; aiStats?: AIStatsResult; usedFallback?: boolean }> {
  const { text, openrouterKey, useAI = true } = args;
  
  // Сначала regex
  const regexStats = extractStats(text);
  const hasRegexStats = hasAnyStats(regexStats);
  const quality = calculateStatsQuality(regexStats);
  
  // Если regex нашёл - возвращаем
  if (hasRegexStats || !useAI || !openrouterKey) {
    return { hasStats: hasRegexStats, quality, stats: regexStats };
  }
  
  // Если regex не нашёл - пробуем AI с fallback
  try {
    const aiStats = await detectStatsWithAI({ text, openrouterKey });
    
    return {
      hasStats: hasRegexStats || aiStats.hasStats,
      quality: aiStats.hasStats ? Math.max(quality, 1) : quality,
      stats: regexStats,
      aiStats,
    };
  } catch (aiError) {
    // AI недоступен - используем расширенный regex как fallback
    console.warn('[Stats] AI detection failed, using enhanced regex fallback:', (aiError as Error).message);
    
    const enhancedStats = extractStatsEnhanced(text);
    const hasEnhancedFindings = enhancedStats.additionalFindings.length > 0;
    
    // Обновляем качество если нашли дополнительные паттерны
    let fallbackQuality = quality;
    if (hasEnhancedFindings && !hasRegexStats) {
      // Даём минимальное качество если нашли что-то через enhanced regex
      fallbackQuality = 1;
    }
    
    return {
      hasStats: hasRegexStats || hasEnhancedFindings,
      quality: fallbackQuality,
      stats: regexStats,
      usedFallback: true,
    };
  }
}
/**
 * Пакетная параллельная детекция статистики в нескольких статьях
 * Обрабатывает несколько абстрактов параллельно для ускорения анализа
 */
export async function detectStatsParallel(args: {
  articles: Array<{
    id: string;
    abstract: string | null | undefined;
  }>;
  openrouterKey?: string;
  useAI?: boolean;
  parallelCount?: number;
  onProgress?: (done: number, total: number, speed?: number) => void;
  onSpeedUpdate?: (articlesPerSecond: number) => void;
}): Promise<{
  analyzed: number;
  found: number;
  results: Map<string, {
    hasStats: boolean;
    quality: number;
    stats: ExtractedStats;
    aiStats?: AIStatsResult;
  }>;
}> {
  const { articles, openrouterKey, useAI = true, parallelCount = 5 } = args;
  const results = new Map();
  let analyzed = 0;
  let found = 0;
  let processed = 0;
  const startTime = Date.now();

  // Очередь для обработки
  const queue = articles.filter(a => a.abstract);
  const inProgress = new Set<Promise<void>>();

  const processQueue = async () => {
    while (queue.length > 0) {
      // Ждём, пока есть свободные слоты
      if (inProgress.size >= parallelCount) {
        await Promise.race(inProgress);
      }

      const article = queue.shift();
      if (!article || !article.abstract) break;

      const promise = (async () => {
        try {
          const result = await detectStatsCombined({
            text: article.abstract || '',
            openrouterKey,
            useAI,
          });

          results.set(article.id, result);
          analyzed++;

          if (result.hasStats || (result.aiStats && result.aiStats.hasStats)) {
            found++;
          }
        } catch (err) {
          console.error(`Stats detection failed for ${article.id}:`, err);
          // Даже при ошибке отмечаем как проанализированную
          analyzed++;
        } finally {
          processed++;

          // Обновляем прогресс
          if (args.onProgress) {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const speed = processed / Math.max(elapsedSeconds, 0.1);
            args.onProgress(processed, queue.length + processed, speed);
          }

          if (args.onSpeedUpdate && processed % 3 === 0) {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const speed = processed / Math.max(elapsedSeconds, 0.1);
            args.onSpeedUpdate(speed);
          }
        }
      })();

      promise.finally(() => {
        inProgress.delete(promise);
      });

      inProgress.add(promise);
    }

    // Ждём завершения всех оставшихся промисов
    await Promise.all(inProgress);
  };

  await processQueue();

  return { analyzed, found, results };
}