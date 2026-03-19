/**
 * CrossPlatformSearchService - Кросс-платформенный поиск научных статей
 * Поддерживает поиск в PubMed, Crossref, arXiv с кэшированием и объединением результатов
 */

import { pool } from "../pg.js";
import { ExternalServiceError } from "../utils/typed-errors.js";

export type SearchProvider = "pubmed" | "crossref" | "arxiv" | "semantic";

export interface SearchQuery {
  query: string;
  providers: SearchProvider[];
  maxResults: number;
  yearFrom?: number;
  yearTo?: number;
  language?: "en" | "ru" | "any";
  sortBy?: "relevance" | "date" | "citations";
}

export interface SearchResult {
  id: string;
  provider: SearchProvider;
  title: string;
  authors: string[];
  abstract?: string;
  doi?: string;
  pmid?: string;
  arxivId?: string;
  journal?: string;
  year?: number;
  url?: string;
  score: number; // Normalized 0-1
  citationCount?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalFound: number;
  providers: {
    [K in SearchProvider]?: {
      count: number;
      status: "success" | "error" | "timeout";
      error?: string;
    };
  };
  cached: boolean;
  searchTime: number;
}

interface CachedSearchResult {
  query_hash: string;
  providers: string[];
  results: SearchResult[];
  total_found: number;
  created_at: Date;
}

export class CrossPlatformSearchService {
  private readonly CACHE_TTL_HOURS = 24;
  private readonly USER_AGENT = "MDsystem/1.0 (https://mdsystem.app)";
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  /**
   * Основной метод поиска с кэшированием
   */
  async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(searchQuery);

    // Проверяем кэш
    const cached = await this.getCachedResult(queryHash);
    if (cached && this.isCacheValid(cached.created_at)) {
      return {
        query: searchQuery.query,
        results: cached.results.slice(0, searchQuery.maxResults),
        totalFound: cached.total_found,
        providers: this.buildProviderStats(
          cached.results,
          searchQuery.providers,
        ),
        cached: true,
        searchTime: Date.now() - startTime,
      };
    }

    // Выполняем поиск по всем провайдерам параллельно
    const searchPromises = searchQuery.providers.map(async (provider) => {
      try {
        return await this.searchProvider(provider, searchQuery);
      } catch (error) {
        console.error(`Search error for ${provider}:`, error);
        return {
          provider,
          results: [],
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const providerResults = await Promise.allSettled(searchPromises);

    // Объединяем и дедуплицируем результаты
    const allResults: SearchResult[] = [];
    const providerStats: SearchResponse["providers"] = {};

    for (const [index, promiseResult] of providerResults.entries()) {
      const provider = searchQuery.providers[index];

      if (promiseResult.status === "fulfilled") {
        const result = promiseResult.value;
        allResults.push(...result.results);
        providerStats[provider] = {
          count: result.results.length,
          status: result.error ? "error" : "success",
          error: result.error,
        };
      } else {
        providerStats[provider] = {
          count: 0,
          status: "error",
          error: promiseResult.reason?.message || "Request failed",
        };
      }
    }

    // Дедупликация и сортировка
    const deduplicatedResults = this.deduplicateResults(allResults);
    const sortedResults = this.sortResults(
      deduplicatedResults,
      searchQuery.sortBy,
    );
    const limitedResults = sortedResults.slice(0, searchQuery.maxResults);

    // Сохраняем в кэш
    await this.cacheResult(queryHash, searchQuery.providers, sortedResults);

    return {
      query: searchQuery.query,
      results: limitedResults,
      totalFound: sortedResults.length,
      providers: providerStats,
      cached: false,
      searchTime: Date.now() - startTime,
    };
  }

  /**
   * Поиск в PubMed через Entrez API
   */
  private async searchPubMed(query: SearchQuery): Promise<SearchResult[]> {
    const searchUrl = new URL(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
    );
    searchUrl.searchParams.set("db", "pubmed");
    searchUrl.searchParams.set("term", this.buildPubMedQuery(query));
    searchUrl.searchParams.set(
      "retmax",
      Math.min(query.maxResults, 200).toString(),
    );
    searchUrl.searchParams.set("retmode", "json");
    searchUrl.searchParams.set(
      "sort",
      query.sortBy === "date" ? "pub_date" : "relevance",
    );

    const searchResponse = await this.fetchWithTimeout(searchUrl.toString());
    const searchData = (await searchResponse.json()) as {
      esearchresult?: { idlist?: string[] };
    };

    const pmids = searchData.esearchresult?.idlist || [];
    if (pmids.length === 0) return [];

    // Получаем детали статей
    const fetchUrl = new URL(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
    );
    fetchUrl.searchParams.set("db", "pubmed");
    fetchUrl.searchParams.set("id", pmids.join(","));
    fetchUrl.searchParams.set("retmode", "xml");

    const fetchResponse = await this.fetchWithTimeout(fetchUrl.toString());
    const xmlText = await fetchResponse.text();

    return this.parsePubMedXML(xmlText);
  }

  /**
   * Поиск в Crossref API
   */
  private async searchCrossref(query: SearchQuery): Promise<SearchResult[]> {
    const searchUrl = new URL("https://api.crossref.org/works");
    searchUrl.searchParams.set("query", query.query);
    searchUrl.searchParams.set(
      "rows",
      Math.min(query.maxResults, 200).toString(),
    );
    searchUrl.searchParams.set(
      "sort",
      query.sortBy === "date" ? "published" : "relevance",
    );

    if (query.yearFrom || query.yearTo) {
      const fromYear = query.yearFrom || 1900;
      const toYear = query.yearTo || new Date().getFullYear();
      searchUrl.searchParams.set(
        "filter",
        `from-pub-date:${fromYear},until-pub-date:${toYear}`,
      );
    }

    const headers = new Headers();
    headers.set("User-Agent", this.USER_AGENT);
    headers.set("mailto", "research@mdsystem.app"); // Рекомендуется Crossref

    const response = await this.fetchWithTimeout(searchUrl.toString(), {
      headers,
    });
    const data = (await response.json()) as {
      message?: { items?: unknown[] };
    };

    const works = data.message?.items || [];
    return works.map((work, index: number) =>
      this.parseCrossrefWork(work as Record<string, unknown>, index),
    );
  }

  /**
   * Поиск в arXiv API
   */
  private async searchArxiv(query: SearchQuery): Promise<SearchResult[]> {
    const searchUrl = new URL("http://export.arxiv.org/api/query");
    searchUrl.searchParams.set("search_query", this.buildArxivQuery(query));
    searchUrl.searchParams.set(
      "max_results",
      Math.min(query.maxResults, 200).toString(),
    );
    searchUrl.searchParams.set(
      "sortBy",
      query.sortBy === "date" ? "submittedDate" : "relevance",
    );
    searchUrl.searchParams.set("sortOrder", "descending");

    const response = await this.fetchWithTimeout(searchUrl.toString());
    const xmlText = await response.text();

    return this.parseArxivXML(xmlText);
  }

  /**
   * Семантический поиск в существующей базе
   */
  private async searchSemantic(
    query: SearchQuery,
    projectId?: string,
  ): Promise<SearchResult[]> {
    if (!projectId) return [];

    try {
      // Используем существующий semantic search
      const semanticResults = await pool.query(
        `SELECT a.id, a.title_en, a.title_ru, a.abstract_en, a.authors, a.journal, a.year, a.doi, a.pmid
         FROM articles a 
         WHERE (a.title_en ILIKE $1 OR a.title_ru ILIKE $1 OR a.abstract_en ILIKE $1)
         ORDER BY 
           CASE 
             WHEN a.title_en ILIKE $2 THEN 1
             WHEN a.title_ru ILIKE $2 THEN 1  
             ELSE 2
           END,
           a.year DESC NULLS LAST
         LIMIT $3`,
        [
          `%${query.query}%`,
          `%${query.query.split(" ")[0]}%`,
          query.maxResults,
        ],
      );

      return semanticResults.rows.map((row, index) => ({
        id: row.id,
        provider: "semantic" as SearchProvider,
        title: row.title_ru || row.title_en || "Без названия",
        authors: row.authors || [],
        abstract: row.abstract_en,
        doi: row.doi,
        pmid: row.pmid,
        journal: row.journal,
        year: row.year,
        score: Math.max(0.1, 1 - index * 0.05), // Убывающий score
      }));
    } catch (error) {
      console.error("Semantic search error:", error);
      return [];
    }
  }

  /**
   * Поиск по конкретному провайдеру
   */
  private async searchProvider(
    provider: SearchProvider,
    query: SearchQuery,
  ): Promise<{
    provider: SearchProvider;
    results: SearchResult[];
    error?: string;
  }> {
    try {
      let results: SearchResult[];

      switch (provider) {
        case "pubmed":
          results = await this.searchPubMed(query);
          break;
        case "crossref":
          results = await this.searchCrossref(query);
          break;
        case "arxiv":
          results = await this.searchArxiv(query);
          break;
        case "semantic":
          results = await this.searchSemantic(query);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      return { provider, results };
    } catch (error) {
      return {
        provider,
        results: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Утилиты для построения запросов
  private buildPubMedQuery(query: SearchQuery): string {
    let searchTerms = query.query;

    if (query.yearFrom || query.yearTo) {
      const fromYear = query.yearFrom || 1900;
      const toYear = query.yearTo || new Date().getFullYear();
      searchTerms += ` AND (${fromYear}[PDAT] : ${toYear}[PDAT])`;
    }

    if (query.language === "en") {
      searchTerms += " AND English[LANG]";
    }

    return searchTerms;
  }

  private buildArxivQuery(query: SearchQuery): string {
    let searchTerms = `all:${query.query}`;

    if (query.yearFrom || query.yearTo) {
      const fromYear = query.yearFrom || 1900;
      const toYear = query.yearTo || new Date().getFullYear();
      searchTerms += ` AND submittedDate:[${fromYear}0101 TO ${toYear}1231]`;
    }

    return searchTerms;
  }

  // Парсеры ответов
  private parsePubMedXML(xmlText: string): SearchResult[] {
    // Упрощенный парсинг XML через регулярные выражения
    const articleMatches =
      xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];

    return articleMatches.map((article, index) => {
      const pmidMatch = article.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const titleMatch = article.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/);
      const abstractMatch = article.match(
        /<AbstractText[^>]*>(.*?)<\/AbstractText>/,
      );
      const doiMatch = article.match(
        /<ELocationID[^>]*EIdType="doi"[^>]*>([^<]+)<\/ELocationID>/,
      );
      const journalMatch = article.match(/<Title>(.*?)<\/Title>/);
      const yearMatch = article.match(/<PubDate>.*?<Year>(\d{4})<\/Year>/);

      // Парсинг авторов
      const authorMatches =
        article.match(/<Author[^>]*>[\s\S]*?<\/Author>/g) || [];
      const authors = authorMatches.map((authorXml) => {
        const lastNameMatch = authorXml.match(/<LastName>(.*?)<\/LastName>/);
        const foreNameMatch = authorXml.match(/<ForeName>(.*?)<\/ForeName>/);
        if (lastNameMatch && foreNameMatch) {
          return `${foreNameMatch[1]} ${lastNameMatch[1]}`;
        }
        return lastNameMatch ? lastNameMatch[1] : "Unknown";
      });

      return {
        id: `pubmed_${pmidMatch?.[1] || index}`,
        provider: "pubmed" as SearchProvider,
        title: titleMatch?.[1]?.replace(/<[^>]*>/g, "") || "No title",
        authors,
        abstract: abstractMatch?.[1]?.replace(/<[^>]*>/g, ""),
        pmid: pmidMatch?.[1],
        doi: doiMatch?.[1],
        journal: journalMatch?.[1],
        year: yearMatch ? parseInt(yearMatch[1]) : undefined,
        url: pmidMatch
          ? `https://pubmed.ncbi.nlm.nih.gov/${pmidMatch[1]}/`
          : undefined,
        score: Math.max(0.1, 1 - index * 0.02),
      };
    });
  }

  private parseCrossrefWork(
    work: Record<string, unknown>,
    index: number,
  ): SearchResult {
    return {
      id: `crossref_${work.DOI || index}`,
      provider: "crossref" as SearchProvider,
      title: Array.isArray(work.title)
        ? work.title[0]
        : work.title || "No title",
      authors: (Array.isArray(work.author) ? work.author : []).map(
        (author: Record<string, unknown>) =>
          `${(author.given as string) || ""} ${(author.family as string) || ""}`.trim(),
      ),
      abstract: work.abstract,
      doi: work.DOI,
      journal: work["container-title"]?.[0],
      year: work.published?.["date-parts"]?.[0]?.[0],
      url: work.URL,
      score: Math.max(0.1, (work.score || 0) / 100), // Crossref score is 0-100
      citationCount: work["is-referenced-by-count"],
    };
  }

  private parseArxivXML(xmlText: string): SearchResult[] {
    const entryMatches = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || [];

    return entryMatches.map((entry, index) => {
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const titleMatch = entry.match(/<title>(.*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>(\d{4})/);
      const authorMatches = entry.match(/<name>(.*?)<\/name>/g) || [];

      const authors = authorMatches.map((match) =>
        match.replace(/<name>(.*?)<\/name>/, "$1"),
      );

      const arxivId = idMatch?.[1]?.split("/").pop()?.replace("abs/", "");

      return {
        id: `arxiv_${arxivId || index}`,
        provider: "arxiv" as SearchProvider,
        title: titleMatch?.[1]?.trim() || "No title",
        authors,
        abstract: summaryMatch?.[1]?.trim().replace(/\s+/g, " "),
        arxivId,
        year: publishedMatch ? parseInt(publishedMatch[1]) : undefined,
        url: idMatch?.[1],
        score: Math.max(0.1, 1 - index * 0.02),
      };
    });
  }

  // Утилиты для дедупликации и сортировки
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const deduplicated: SearchResult[] = [];

    for (const result of results) {
      // Создаем ключ дедупликации на основе DOI, PMID или названия
      const dedupeKey =
        result.doi || result.pmid || result.title.toLowerCase().trim();

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        deduplicated.push(result);
      } else {
        // При дублировании, берем результат с лучшим score или более полной информацией
        const existingIndex = deduplicated.findIndex(
          (r) =>
            (r.doi && r.doi === result.doi) ||
            (r.pmid && r.pmid === result.pmid) ||
            r.title.toLowerCase().trim() === result.title.toLowerCase().trim(),
        );

        if (existingIndex >= 0) {
          const existing = deduplicated[existingIndex];
          if (
            result.score > existing.score ||
            (!existing.abstract && result.abstract) ||
            (!existing.doi && result.doi)
          ) {
            deduplicated[existingIndex] = result;
          }
        }
      }
    }

    return deduplicated;
  }

  private sortResults(
    results: SearchResult[],
    sortBy?: SearchQuery["sortBy"],
  ): SearchResult[] {
    switch (sortBy) {
      case "date":
        return results.sort((a, b) => (b.year || 0) - (a.year || 0));
      case "citations":
        return results.sort(
          (a, b) => (b.citationCount || 0) - (a.citationCount || 0),
        );
      default: // relevance
        return results.sort((a, b) => b.score - a.score);
    }
  }

  // Кэширование
  private generateQueryHash(query: SearchQuery): string {
    const normalized = {
      query: query.query.toLowerCase().trim(),
      providers: [...query.providers].sort(),
      maxResults: query.maxResults,
      yearFrom: query.yearFrom,
      yearTo: query.yearTo,
      language: query.language,
      sortBy: query.sortBy,
    };
    return Buffer.from(JSON.stringify(normalized)).toString("base64");
  }

  private async getCachedResult(
    queryHash: string,
  ): Promise<CachedSearchResult | null> {
    try {
      const result = await pool.query(
        `SELECT query_hash, providers, results, total_found, created_at 
         FROM search_cache WHERE query_hash = $1`,
        [queryHash],
      );

      if (result.rows.length === 0) return null;

      return result.rows[0] as CachedSearchResult;
    } catch {
      return null;
    }
  }

  private async cacheResult(
    queryHash: string,
    providers: SearchProvider[],
    results: SearchResult[],
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO search_cache (query_hash, providers, results, total_found, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (query_hash) 
         DO UPDATE SET providers = $2, results = $3, total_found = $4, created_at = NOW()`,
        [
          queryHash,
          JSON.stringify(providers),
          JSON.stringify(results),
          results.length,
        ],
      );
    } catch (error) {
      console.error("Cache save error:", error);
      // Не прерываем выполнение при ошибке кэширования
    }
  }

  private isCacheValid(createdAt: Date): boolean {
    const now = new Date();
    const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return diffHours < this.CACHE_TTL_HOURS;
  }

  private buildProviderStats(
    results: SearchResult[],
    requestedProviders: SearchProvider[],
  ): SearchResponse["providers"] {
    const stats: SearchResponse["providers"] = {};

    for (const provider of requestedProviders) {
      const count = results.filter((r) => r.provider === provider).length;
      stats[provider] = {
        count,
        status: "success",
      };
    }

    return stats;
  }

  private async fetchWithTimeout(
    url: string,
    options?: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.REQUEST_TIMEOUT,
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "User-Agent": this.USER_AGENT,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new ExternalServiceError(
          "search_api",
          `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
