export type RankingSignals = {
  aiScore?: number | null;
  year?: number | null;
  citations?: number | null;
  hasStats?: boolean;
  lexical?: number | null;
};

export type RankableArticle<T> = T & {
  title?: string;
  abstract?: string | null;
  signals?: RankingSignals;
};

export type RankedArticle<T> = RankableArticle<T> & {
  score: number;
  scoreBreakdown: {
    lexical: number;
    freshness: number;
    citations: number;
    stats: number;
    ai: number;
  };
  explain: string[];
};

const CURRENT_YEAR = new Date().getFullYear();

function lexicalScore(queryTokens: string[], text: string | undefined): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let matches = 0;
  for (const t of queryTokens) {
    if (t && lower.includes(t)) matches++;
  }
  return matches / Math.max(queryTokens.length, 1);
}

function freshness(year?: number | null): number {
  if (!year || year <= 0) return 0;
  const age = CURRENT_YEAR - year;
  if (age <= 0) return 1;
  if (age >= 20) return 0;
  return Math.max(0, (20 - age) / 20);
}

function normalizeCitations(count?: number | null): number {
  if (!count || count <= 0) return 0;
  return Math.tanh(count / 100);
}

export function rankArticles<T>(args: {
  articles: RankableArticle<T>[];
  query: string;
  weights?: {
    lexical?: number;
    freshness?: number;
    citations?: number;
    stats?: number;
    ai?: number;
  };
}): RankedArticle<T>[] {
  const tokens = args.query.toLowerCase().split(/\s+/).filter(Boolean);

  const weights = {
    lexical: 4,
    freshness: 2,
    citations: 1,
    stats: 1,
    ai: 2,
    ...args.weights,
  };

  return args.articles
    .map((article) => {
      const signals = article.signals || {};
      const lex = lexicalScore(
        tokens,
        `${article.title || ""} ${article.abstract || ""}`,
      );
      const fresh = freshness(
        signals.year ?? (article as { year?: number }).year,
      );
      const cits = normalizeCitations(signals.citations ?? null);
      const stats = signals.hasStats ? 0.5 : 0;
      const ai = signals.aiScore ?? 0;

      const score =
        lex * weights.lexical +
        fresh * weights.freshness +
        cits * weights.citations +
        stats * weights.stats +
        ai * weights.ai;

      const explain = [
        `lexical=${lex.toFixed(2)} w=${weights.lexical}`,
        `freshness=${fresh.toFixed(2)} w=${weights.freshness}`,
        `citations=${cits.toFixed(2)} w=${weights.citations}`,
        `stats=${stats.toFixed(2)} w=${weights.stats}`,
        `ai=${ai.toFixed(2)} w=${weights.ai}`,
      ];

      return {
        ...article,
        score,
        scoreBreakdown: {
          lexical: Number(lex.toFixed(3)),
          freshness: Number(fresh.toFixed(3)),
          citations: Number(cits.toFixed(3)),
          stats: Number(stats.toFixed(3)),
          ai: Number(ai.toFixed(3)),
        },
        explain,
      } as RankedArticle<T>;
    })
    .sort((a, b) => b.score - a.score);
}
