import { pool } from "../pg.js";
import { cacheGet, cacheSet, TTL } from "./redis.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("semantic-auto-prep");

const CLUSTER_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#f97316",
  "#14b8a6",
  "#ef4444",
  "#84cc16",
  "#a855f7",
  "#3b82f6",
];

const AUTO_CLUSTER_SETTINGS = {
  numClusters: 5,
  minClusterSize: 3,
  similarityThreshold: 0.6,
};

interface AutoSemanticPreparationOptions {
  projectId: string;
}

interface ArticleWithEmbedding {
  id: string;
  title: string;
  abstract: string;
  embedding: number[];
}

interface Cluster {
  centroid: number[];
  members: ArticleWithEmbedding[];
  avgSimilarity: number;
}

type GapRow = {
  article1_id: string;
  article2_id: string;
  similarity: string | number;
  article1_title: string | null;
  article1_year: number | null;
  article2_title: string | null;
  article2_year: number | null;
};

type GapCacheItem = {
  article1: { id: string; title: string | null; year: number | null };
  article2: { id: string; title: string | null; year: number | null };
  similarity: number;
  reason: string;
};

type GapCachePayload = {
  gaps: GapCacheItem[];
  threshold: number;
  totalGaps: number;
};

async function tableExists(tableName: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     )`,
    [tableName],
  );
  return Boolean(res.rows[0]?.exists);
}

function parseEmbedding(embeddingStr: string): number[] {
  const cleaned = embeddingStr.replace(/\[|\]/g, "");
  if (!cleaned.trim()) return [];
  return cleaned.split(",").map((s) => parseFloat(s.trim()));
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function kMeansClustering(
  articles: ArticleWithEmbedding[],
  k: number,
  minSimilarity: number,
  maxIterations: number = 50,
): Cluster[] {
  if (articles.length === 0 || k <= 0) return [];

  const centroids: number[][] = [];
  const usedIndices = new Set<number>();

  const firstIndex = Math.floor(Math.random() * articles.length);
  centroids.push([...articles[firstIndex].embedding]);
  usedIndices.add(firstIndex);

  while (centroids.length < k) {
    const distances = articles.map((article, idx) => {
      if (usedIndices.has(idx)) return 0;
      return Math.min(
        ...centroids.map((c) => 1 - cosineSimilarity(article.embedding, c)),
      );
    });

    const totalDist = distances.reduce((a, b) => a + b, 0);
    if (totalDist === 0) break;

    let random = Math.random() * totalDist;
    for (let i = 0; i < distances.length; i++) {
      random -= distances[i];
      if (random <= 0 && !usedIndices.has(i)) {
        centroids.push([...articles[i].embedding]);
        usedIndices.add(i);
        break;
      }
    }
  }

  let assignments: number[] = new Array(articles.length).fill(-1);

  for (let iter = 0; iter < maxIterations; iter++) {
    const newAssignments = articles.map((article) => {
      let bestCluster = 0;
      let bestSim = -Infinity;

      for (let c = 0; c < centroids.length; c++) {
        const sim = cosineSimilarity(article.embedding, centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = c;
        }
      }

      return bestSim >= minSimilarity ? bestCluster : -1;
    });

    if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) {
      break;
    }
    assignments = newAssignments;

    for (let c = 0; c < centroids.length; c++) {
      const members = articles.filter((_, i) => assignments[i] === c);
      if (members.length === 0) continue;

      const newCentroid = new Array(centroids[c].length).fill(0);
      for (const member of members) {
        for (let i = 0; i < member.embedding.length; i++) {
          newCentroid[i] += member.embedding[i];
        }
      }
      for (let i = 0; i < newCentroid.length; i++) {
        newCentroid[i] /= members.length;
      }
      centroids[c] = newCentroid;
    }
  }

  const clusters: Cluster[] = [];
  for (let c = 0; c < centroids.length; c++) {
    const members = articles.filter((_, i) => assignments[i] === c);
    if (members.length === 0) continue;

    let totalSim = 0;
    let pairCount = 0;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        totalSim += cosineSimilarity(
          members[i].embedding,
          members[j].embedding,
        );
        pairCount++;
      }
    }

    clusters.push({
      centroid: centroids[c],
      members,
      avgSimilarity: pairCount > 0 ? totalSim / pairCount : 0,
    });
  }

  return clusters;
}

function findCentralArticle(
  members: ArticleWithEmbedding[],
): ArticleWithEmbedding | null {
  if (members.length === 0) return null;

  let bestArticle: ArticleWithEmbedding | null = null;
  let bestScore = -Infinity;

  for (const member of members) {
    let score = 0;
    for (const other of members) {
      if (other.id !== member.id) {
        score += cosineSimilarity(member.embedding, other.embedding);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestArticle = member;
    }
  }

  return bestArticle;
}

function extractKeywords(titles: string[]): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "to",
    "in",
    "for",
    "with",
    "on",
    "at",
    "by",
    "from",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "that",
    "this",
    "these",
    "those",
    "study",
    "analysis",
    "review",
    "patients",
    "results",
    "effect",
    "effects",
    "using",
    "based",
    "new",
  ]);

  const wordCounts: Record<string, number> = {};

  for (const title of titles) {
    const words = title
      .toLowerCase()
      .replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function generateGapReason(
  similarity: number,
  year1: number | null,
  year2: number | null,
): string {
  const simPercent = Math.round(similarity * 100);

  if (year1 && year2) {
    const yearDiff = Math.abs(year1 - year2);
    if (yearDiff <= 2) {
      return `Высокая схожесть (${simPercent}%) между современными работами - возможно, авторы не знали о работе друг друга`;
    }
    if (yearDiff <= 5) {
      return `Схожие темы (${simPercent}%), небольшая временная разница - проверьте цитирования`;
    }
    return `Тематическая связь (${simPercent}%) между работами разных периодов`;
  }

  return `Семантическая схожесть ${simPercent}% без прямого цитирования`;
}

export function buildGapAnalysisCacheKey(
  projectId: string,
  threshold: number,
  limit: number,
  yearFrom?: number,
  yearTo?: number,
): string {
  const normalizedThreshold = Number.isFinite(threshold)
    ? threshold.toFixed(3)
    : "0.700";
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 50;
  const fromPart = yearFrom ?? "any";
  const toPart = yearTo ?? "any";
  return `proj:${projectId}:graph:gaps:${normalizedThreshold}:${safeLimit}:${fromPart}:${toPart}`;
}

export async function warmGapAnalysisCache(
  projectId: string,
  threshold: number = 0.7,
  limit: number = 50,
  yearFrom?: number,
  yearTo?: number,
): Promise<GapCachePayload> {
  const cacheKey = buildGapAnalysisCacheKey(
    projectId,
    threshold,
    limit,
    yearFrom,
    yearTo,
  );
  const cached = await cacheGet<GapCachePayload>(cacheKey);
  if (cached) {
    return cached;
  }

  const hasEmbeddings = await tableExists("article_embeddings");
  if (!hasEmbeddings) {
    const emptyPayload: GapCachePayload = {
      gaps: [],
      threshold,
      totalGaps: 0,
    };
    await cacheSet(cacheKey, emptyPayload, TTL.LONG);
    return emptyPayload;
  }

  const gapRowsRes = await pool.query(
    `WITH project_article_ids AS (
       SELECT a.id, a.pmid, a.reference_pmids, a.title_en, a.year
       FROM articles a
       JOIN project_articles pa ON pa.article_id = a.id
       WHERE pa.project_id = $1 AND pa.status != 'deleted'
     ),
     reference_article_ids AS (
       SELECT DISTINCT ref_article.id, ref_article.pmid, ref_article.reference_pmids,
              ref_article.title_en, ref_article.year
       FROM articles a
       JOIN project_articles pa ON pa.article_id = a.id
       CROSS JOIN LATERAL unnest(COALESCE(a.reference_pmids, ARRAY[]::text[])) AS ref_pmid
       JOIN articles ref_article ON ref_article.pmid = ref_pmid
       WHERE pa.project_id = $1 AND pa.status != 'deleted'
     ),
     cited_by_article_ids AS (
       SELECT DISTINCT cited_article.id, cited_article.pmid, cited_article.reference_pmids,
              cited_article.title_en, cited_article.year
       FROM articles a
       JOIN project_articles pa ON pa.article_id = a.id
       CROSS JOIN LATERAL unnest(COALESCE(a.cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
       JOIN articles cited_article ON cited_article.pmid = cited_pmid
       WHERE pa.project_id = $1 AND pa.status != 'deleted'
     ),
     all_graph_articles AS (
       SELECT * FROM project_article_ids
       UNION SELECT * FROM reference_article_ids
       UNION SELECT * FROM cited_by_article_ids
     ),
     article_pairs AS (
       SELECT
         ae1.article_id as article1_id,
         ae2.article_id as article2_id,
         1 - (ae1.embedding <=> ae2.embedding) as similarity
       FROM article_embeddings ae1
       JOIN article_embeddings ae2 ON ae1.article_id < ae2.article_id
       JOIN all_graph_articles ag1 ON ag1.id = ae1.article_id
       JOIN all_graph_articles ag2 ON ag2.id = ae2.article_id
       WHERE 1 - (ae1.embedding <=> ae2.embedding) >= $2
     )
     SELECT
       ap.article1_id,
       ap.article2_id,
       ap.similarity,
       a1.title_en as article1_title,
       a1.year as article1_year,
       a2.title_en as article2_title,
       a2.year as article2_year
     FROM article_pairs ap
     JOIN articles a1 ON a1.id = ap.article1_id
     JOIN articles a2 ON a2.id = ap.article2_id
     WHERE NOT (
       a1.reference_pmids @> ARRAY[a2.pmid]
       OR a2.reference_pmids @> ARRAY[a1.pmid]
       OR a1.cited_by_pmids @> ARRAY[a2.pmid]
       OR a2.cited_by_pmids @> ARRAY[a1.pmid]
     )
       AND ($4::int IS NULL OR a1.year IS NULL OR a1.year >= $4)
       AND ($5::int IS NULL OR a1.year IS NULL OR a1.year <= $5)
       AND ($4::int IS NULL OR a2.year IS NULL OR a2.year >= $4)
       AND ($5::int IS NULL OR a2.year IS NULL OR a2.year <= $5)
     ORDER BY ap.similarity DESC
     LIMIT $3`,
    [projectId, threshold, limit, yearFrom ?? null, yearTo ?? null],
  );

  const rows = gapRowsRes.rows as GapRow[];
  const payload: GapCachePayload = {
    gaps: rows.map((row) => {
      const similarity = parseFloat(String(row.similarity));
      return {
        article1: {
          id: row.article1_id,
          title: row.article1_title,
          year: row.article1_year,
        },
        article2: {
          id: row.article2_id,
          title: row.article2_title,
          year: row.article2_year,
        },
        similarity,
        reason: generateGapReason(similarity, row.article1_year, row.article2_year),
      };
    }),
    threshold,
    totalGaps: rows.length,
  };

  await cacheSet(cacheKey, payload, TTL.LONG);
  return payload;
}

async function createSemanticClusters(projectId: string): Promise<number> {
  const hasEmbeddings = await tableExists("article_embeddings");
  const hasClustersTable = await tableExists("semantic_clusters");
  const hasClusterArticlesTable = await tableExists("semantic_cluster_articles");

  if (!hasEmbeddings || !hasClustersTable || !hasClusterArticlesTable) {
    return 0;
  }

  const embeddingsResult = await pool.query(
    `WITH project_article_ids AS (
       SELECT a.id FROM articles a
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
     ),
     cited_by_article_ids AS (
       SELECT DISTINCT cited_article.id
       FROM articles a
       JOIN project_articles pa ON pa.article_id = a.id
       CROSS JOIN LATERAL unnest(COALESCE(a.cited_by_pmids, ARRAY[]::text[])) AS cited_pmid
       JOIN articles cited_article ON cited_article.pmid = cited_pmid
       WHERE pa.project_id = $1 AND pa.status != 'deleted'
     ),
     all_graph_article_ids AS (
       SELECT id FROM project_article_ids
       UNION SELECT id FROM reference_article_ids
       UNION SELECT id FROM cited_by_article_ids
     )
     SELECT ae.article_id, ae.embedding::text, a.title_en, a.abstract_en
     FROM article_embeddings ae
     JOIN all_graph_article_ids ag ON ag.id = ae.article_id
     JOIN articles a ON a.id = ae.article_id`,
    [projectId],
  );

  if (
    embeddingsResult.rows.length <
    AUTO_CLUSTER_SETTINGS.minClusterSize * 2
  ) {
    return 0;
  }

  const articles: ArticleWithEmbedding[] = embeddingsResult.rows
    .map((row) => ({
      id: String(row.article_id),
      title: String(row.title_en || ""),
      abstract: String(row.abstract_en || ""),
      embedding: parseEmbedding(String(row.embedding)),
    }))
    .filter((row) => row.embedding.length > 0);

  if (articles.length < AUTO_CLUSTER_SETTINGS.minClusterSize * 2) {
    return 0;
  }

  const actualNumClusters = Math.min(
    AUTO_CLUSTER_SETTINGS.numClusters,
    Math.floor(articles.length / AUTO_CLUSTER_SETTINGS.minClusterSize),
  );
  if (actualNumClusters < 2) {
    return 0;
  }

  const clusters = kMeansClustering(
    articles,
    actualNumClusters,
    AUTO_CLUSTER_SETTINGS.similarityThreshold,
  );
  const validClusters = clusters.filter(
    (cluster) => cluster.members.length >= AUTO_CLUSTER_SETTINGS.minClusterSize,
  );

  await pool.query(`DELETE FROM semantic_clusters WHERE project_id = $1`, [
    projectId,
  ]);

  let createdClusters = 0;

  for (let i = 0; i < validClusters.length; i++) {
    const cluster = validClusters[i];
    const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
    const centralArticle = findCentralArticle(cluster.members);
    const keywords = extractKeywords(
      cluster.members.map((member) => member.title).filter(Boolean),
    );

    const clusterRes = await pool.query(
      `INSERT INTO semantic_clusters
       (project_id, name, name_en, color, keywords, central_article_id, avg_internal_similarity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        projectId,
        `Кластер ${i + 1}`,
        `Cluster ${i + 1}`,
        color,
        keywords,
        centralArticle?.id || null,
        cluster.avgSimilarity,
      ],
    );
    const clusterId = clusterRes.rows[0].id;

    for (const member of cluster.members) {
      const similarityToCenter = centralArticle
        ? cosineSimilarity(member.embedding, centralArticle.embedding)
        : 0;

      await pool.query(
        `INSERT INTO semantic_cluster_articles (cluster_id, article_id, similarity_to_center)
         VALUES ($1, $2, $3)
         ON CONFLICT (cluster_id, article_id)
         DO UPDATE SET similarity_to_center = EXCLUDED.similarity_to_center`,
        [clusterId, member.id, similarityToCenter],
      );
    }

    createdClusters++;
  }

  return createdClusters;
}

export async function runAutoSemanticPreparation(
  options: AutoSemanticPreparationOptions,
): Promise<{ clustersCreated: number; gapsWarmed: number }> {
  const { projectId } = options;

  let clustersCreated = 0;
  let gapsWarmed = 0;

  try {
    clustersCreated = await createSemanticClusters(projectId);
  } catch (err) {
    log.warn("Auto semantic clusters preparation failed", {
      projectId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const gaps = await warmGapAnalysisCache(projectId, 0.7, 50);
    gapsWarmed = gaps.totalGaps;
  } catch (err) {
    log.warn("Auto gap warmup failed", {
      projectId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  log.info("Auto semantic preparation completed", {
    projectId,
    clustersCreated,
    gapsWarmed,
  });

  return { clustersCreated, gapsWarmed };
}
