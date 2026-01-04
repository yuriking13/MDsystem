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
