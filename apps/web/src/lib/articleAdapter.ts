/**
 * Adapter utilities to convert between API Article type and UI ArticleData type
 */

import type { Article } from "./api";
import type { ArticleData, ArticleAuthor } from "../components/ArticleCard";

/**
 * Convert API Article to UI ArticleData format
 */
export function toArticleData(article: Article): ArticleData {
  // Parse authors string array to ArticleAuthor objects
  const authors: ArticleAuthor[] = (article.authors || []).map((name) => ({
    name,
    affiliation: undefined,
  }));

  // Map source string to valid source type
  const sourceMap: Record<string, ArticleData["source"]> = {
    pubmed: "pubmed",
    doaj: "doaj",
    wiley: "wiley",
  };
  const source = sourceMap[article.source?.toLowerCase()] || "pubmed";

  // Extract stats info
  const stats = article.has_stats
    ? {
        hasStatistics: true,
        statisticalMethods: article.stats_json?.methods || [],
        sampleSize: article.stats_json?.sampleSize,
        pValues: article.stats_json?.pValues || [],
      }
    : undefined;

  return {
    id: article.id,
    pmid: article.pmid || undefined,
    doi: article.doi || undefined,
    title: article.title_en,
    titleRu: article.title_ru || undefined,
    authors,
    journal: article.journal || undefined,
    year: article.year || new Date().getFullYear(),
    abstract: article.abstract_en || undefined,
    abstractRu: article.abstract_ru || undefined,
    publicationType: article.publication_types?.[0] || undefined,
    status: article.status,
    sourceQuery: undefined, // Not available in API response directly
    source,
    citationCount: undefined, // Not available in basic Article type
    hasFullText: undefined,
    hasFreeFullText: undefined,
    stats,
    tags: article.tags || undefined,
    notes: article.notes || undefined,
  };
}

/**
 * Convert multiple articles
 */
export function toArticleDataArray(articles: Article[]): ArticleData[] {
  return articles.map(toArticleData);
}

/**
 * Get article status from ArticleData status
 */
export function toApiStatus(status: ArticleData["status"]): Article["status"] {
  return status;
}
