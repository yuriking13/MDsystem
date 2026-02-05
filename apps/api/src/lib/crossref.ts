/**
 * Crossref API integration
 * Для обогащения метаданных статей по DOI
 */

import { resilientFetch } from "./http-client.js";
import { getCachedCrossref, normalizeDOI } from "./redis.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("crossref");

const CROSSREF_API = "https://api.crossref.org";

export interface CrossrefWork {
  DOI: string;
  title?: string[];
  "container-title"?: string[];
  author?: Array<{
    family?: string;
    given?: string;
    ORCID?: string;
    affiliation?: Array<{ name: string }>;
  }>;
  abstract?: string;
  type?: string;
  issued?: {
    "date-parts"?: number[][];
  };
  published?: {
    "date-parts"?: number[][];
  };
  volume?: string;
  issue?: string;
  page?: string;
  publisher?: string;
  ISSN?: string[];
  "is-referenced-by-count"?: number;
  "references-count"?: number;
  license?: Array<{
    URL: string;
    start?: { "date-parts": number[][] };
    "content-version"?: string;
  }>;
  link?: Array<{
    URL: string;
    "content-type"?: string;
    "intended-application"?: string;
  }>;
  reference?: Array<{
    key: string;
    DOI?: string;
    "article-title"?: string;
    author?: string;
    year?: string;
    "journal-title"?: string;
  }>;
  subject?: string[];
}

export interface CrossrefResponse {
  status: string;
  "message-type": string;
  message: CrossrefWork | { items: CrossrefWork[]; "total-results": number };
}

export interface EnrichedArticleData {
  publisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  issn?: string;
  citedByCount?: number;
  referencesCount?: number;
  license?: string;
  fullTextUrl?: string;
  pdfUrl?: string;
  subjects?: string[];
  references?: Array<{
    doi?: string;
    title?: string;
    author?: string;
    year?: string;
    journal?: string;
  }>;
}

/**
 * Получить метаданные работы по DOI (с кэшированием)
 */
export async function getCrossrefByDOI(
  doi: string,
  userAgent = "ThesisMD/1.0 (mailto:support@thesis.app)",
): Promise<CrossrefWork | null> {
  // Validate and normalize DOI
  const normalizedDoi = normalizeDOI(doi);
  if (!normalizedDoi) {
    log.warn(`Invalid DOI format: ${doi}`);
    return null;
  }

  // Use caching wrapper
  return getCachedCrossref<CrossrefWork>(normalizedDoi, async () => {
    const url = `${CROSSREF_API}/works/${encodeURIComponent(normalizedDoi)}`;

    try {
      const res = await resilientFetch(url, {
        apiName: "crossref",
        headers: {
          "User-Agent": userAgent,
        },
        retry: { maxRetries: 2 },
        timeoutMs: 15000,
      });

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Crossref API error: ${res.status}`);
      }

      const data = (await res.json()) as CrossrefResponse;
      return data.message as CrossrefWork;
    } catch (err) {
      log.error("Crossref fetch error", err as Error);
      return null;
    }
  });
}

/**
 * Поиск работ в Crossref
 */
export async function searchCrossref(
  query: string,
  options: {
    rows?: number;
    offset?: number;
    filter?: string;
  } = {},
): Promise<{ items: CrossrefWork[]; total: number }> {
  const url = new URL(`${CROSSREF_API}/works`);
  url.searchParams.set("query", query);
  url.searchParams.set("rows", String(options.rows || 20));
  if (options.offset) url.searchParams.set("offset", String(options.offset));
  if (options.filter) url.searchParams.set("filter", options.filter);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ThesisMD/1.0 (mailto:support@thesis.app)",
      },
    });

    if (!res.ok) {
      throw new Error(`Crossref search error: ${res.status}`);
    }

    const data = (await res.json()) as CrossrefResponse;
    const msg = data.message as {
      items: CrossrefWork[];
      "total-results": number;
    };

    return {
      items: msg.items || [],
      total: msg["total-results"] || 0,
    };
  } catch (err) {
    log.error("Crossref search error", err as Error);
    return { items: [], total: 0 };
  }
}

/**
 * Извлечь обогащённые данные из Crossref работы
 */
export function extractEnrichedData(work: CrossrefWork): EnrichedArticleData {
  const data: EnrichedArticleData = {};

  // Издатель
  if (work.publisher) {
    data.publisher = work.publisher;
  }

  // Том, выпуск, страницы
  if (work.volume) data.volume = work.volume;
  if (work.issue) data.issue = work.issue;
  if (work.page) data.pages = work.page;

  // ISSN
  if (work.ISSN?.length) {
    data.issn = work.ISSN[0];
  }

  // Цитирования
  if (work["is-referenced-by-count"]) {
    data.citedByCount = work["is-referenced-by-count"];
  }
  if (work["references-count"]) {
    data.referencesCount = work["references-count"];
  }

  // Лицензия
  if (work.license?.length) {
    const openLicense = work.license.find(
      (l) =>
        l.URL?.includes("creativecommons") || l["content-version"] === "vor",
    );
    if (openLicense) {
      data.license = openLicense.URL;
    }
  }

  // Ссылки на полный текст
  if (work.link?.length) {
    for (const link of work.link) {
      if (link["content-type"]?.includes("pdf")) {
        data.pdfUrl = link.URL;
      } else if (link["intended-application"] === "text-mining") {
        data.fullTextUrl = link.URL;
      }
    }
  }

  // Темы/предметные области
  if (work.subject?.length) {
    data.subjects = work.subject;
  }

  // Ссылки (references)
  if (work.reference?.length) {
    data.references = work.reference.slice(0, 50).map((ref) => ({
      doi: ref.DOI,
      title: ref["article-title"],
      author: ref.author,
      year: ref.year,
      journal: ref["journal-title"],
    }));
  }

  return data;
}

/**
 * Обогатить статью данными из Crossref по DOI
 */
export async function enrichArticleByDOI(
  doi: string,
): Promise<EnrichedArticleData | null> {
  const work = await getCrossrefByDOI(doi);
  if (!work) return null;

  return extractEnrichedData(work);
}
/**
 * Пакетное обогащение статей данными из Crossref с параллелизмом
 * Обрабатывает несколько DOI параллельно для быстрого обогащения
 */
export async function enrichArticlesByDOIBatch(
  articles: Array<{
    id: string;
    doi: string;
  }>,
  options: {
    parallelCount?: number; // Количество параллельных запросов
    onProgress?: (done: number, total: number, speed?: number) => void;
    onSpeedUpdate?: (articlesPerSecond: number) => void;
  } = {},
): Promise<{
  enriched: number;
  failed: number;
  results: Map<string, EnrichedArticleData>;
}> {
  const parallelCount = options.parallelCount ?? 5;
  const results = new Map<string, EnrichedArticleData>();
  let enriched = 0;
  let failed = 0;
  let processed = 0;
  const startTime = Date.now();

  // Очередь для обработки
  const queue = [...articles];
  const inProgress = new Set<Promise<void>>();

  const processQueue = async () => {
    while (queue.length > 0) {
      // Ждём, пока есть свободные слоты
      if (inProgress.size >= parallelCount) {
        await Promise.race(inProgress);
      }

      const article = queue.shift();
      if (!article) break;

      const promise = (async () => {
        try {
          const enrichedData = await enrichArticleByDOI(article.doi);
          if (enrichedData) {
            results.set(article.id, enrichedData);
            enriched++;
          } else {
            failed++;
          }
        } catch (err) {
          log.error(`Enrichment failed for ${article.doi}`, err as Error);
          failed++;
        } finally {
          processed++;

          // Обновляем прогресс
          if (options.onProgress) {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const speed = processed / Math.max(elapsedSeconds, 0.1);
            options.onProgress(processed, articles.length, speed);
          }

          if (options.onSpeedUpdate && processed % 5 === 0) {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const speed = processed / Math.max(elapsedSeconds, 0.1);
            options.onSpeedUpdate(speed);
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

  return { enriched, failed, results };
}
