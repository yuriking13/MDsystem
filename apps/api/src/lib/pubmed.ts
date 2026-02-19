import { XMLParser } from "fast-xml-parser";
import { sleep } from "./http.js";
import { resilientFetch, resilientFetchJson } from "./http-client.js";
import { cacheSet, cacheGet, CACHE_KEYS, TTL } from "./redis.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("pubmed");

// Декодирование HTML entities в тексте (&#xe3; -> ã, &#x2264; -> ≤)
function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  return (
    text
      // Числовые entities (hex и dec)
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      )
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      // Именованные entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&ndash;/g, "–")
      .replace(/&mdash;/g, "—")
      .replace(/&lsquo;/g, "\u2018")
      .replace(/&rsquo;/g, "\u2019")
      .replace(/&ldquo;/g, "\u201C")
      .replace(/&rdquo;/g, "\u201D")
      .replace(/&hellip;/g, "…")
      .replace(/&trade;/g, "™")
      .replace(/&copy;/g, "©")
      .replace(/&reg;/g, "®")
      .replace(/&deg;/g, "°")
      .replace(/&plusmn;/g, "±")
      .replace(/&times;/g, "×")
      .replace(/&divide;/g, "÷")
      .replace(/&micro;/g, "µ")
      .replace(/&alpha;/g, "α")
      .replace(/&beta;/g, "β")
      .replace(/&gamma;/g, "γ")
      .replace(/&delta;/g, "δ")
      .replace(/&epsilon;/g, "ε")
      .replace(/&sigma;/g, "σ")
      .replace(/&omega;/g, "ω")
      .replace(/&le;/g, "≤")
      .replace(/&ge;/g, "≥")
      .replace(/&ne;/g, "≠")
      .replace(/&asymp;/g, "≈")
      .replace(/&rarr;/g, "→")
      .replace(/&larr;/g, "←")
  );
}

// PubMed search fields - https://pubmed.ncbi.nlm.nih.gov/help/#search-tags
export type PubMedSearchField =
  | "All Fields" // [All Fields] - по умолчанию
  | "Title" // [Title] - только заголовок
  | "Title/Abstract" // [Title/Abstract] - заголовок и аннотация
  | "Text Word" // [tw] - текст статьи
  | "Author" // [Author]
  | "Author - First" // [1au] - первый автор
  | "Author - Last" // [lastau] - последний автор
  | "Journal" // [Journal]
  | "MeSH Terms" // [MeSH Terms]
  | "MeSH Major Topic" // [MeSH Major Topic]
  | "Affiliation" // [Affiliation]
  | "Publication Type" // [pt]
  | "Language"; // [Language]

export type PubMedFilters = {
  searchField?: PubMedSearchField; // Поле для поиска (по умолчанию All Fields)
  publishedFrom?: string; // YYYY-MM-DD
  publishedTo?: string; // YYYY-MM-DD
  freeFullTextOnly?: boolean;
  fullTextOnly?: boolean;
  publicationTypes?: string[]; // e.g. ["Systematic Review", "Meta-Analysis"]
  publicationTypesLogic?: "or" | "and"; // default "or"
};

export type PubMedArticle = {
  pmid: string;
  doi?: string;
  title: string;
  abstract?: string;
  authors?: string;
  journal?: string;
  year?: number;
  url: string;
  studyTypes: string[];
};

type PubMedAuthor = {
  LastName?: string;
  Initials?: string;
};

type ElinkId = string | { "#text"?: string };
type ElinkLink = { Id?: ElinkId };
type ElinkSet = {
  IdList?: { Id?: ElinkId };
  LinkSetDb?: { Link?: ElinkLink | ElinkLink[] };
};
type ElinkResponse = {
  eLinkResult?: { LinkSet?: ElinkSet | ElinkSet[] };
};

// Маппинг полей поиска на PubMed теги
const SEARCH_FIELD_TAGS: Record<PubMedSearchField, string> = {
  "All Fields": "", // Без тега - PubMed ищет везде
  Title: "[ti]",
  "Title/Abstract": "[tiab]",
  "Text Word": "[tw]",
  Author: "[au]",
  "Author - First": "[1au]",
  "Author - Last": "[lastau]",
  Journal: "[ta]",
  "MeSH Terms": "[mh]",
  "MeSH Major Topic": "[majr]",
  Affiliation: "[ad]",
  "Publication Type": "[pt]",
  Language: "[la]",
};

function buildPubmedTerm(topic: string, filters: PubMedFilters): string {
  const terms: string[] = [];

  // базовая тема с полем поиска
  const fieldTag = filters.searchField
    ? SEARCH_FIELD_TAGS[filters.searchField] || ""
    : "";
  if (fieldTag) {
    // Если поле указано, добавляем тег к теме
    terms.push(`(${topic})${fieldTag}`);
  } else {
    terms.push(`(${topic})`);
  }

  // free full text (бесплатный полный текст)
  if (filters.freeFullTextOnly) {
    terms.push(`free full text[sb]`);
  }
  // full text (полный текст, включая платный)
  else if (filters.fullTextOnly) {
    terms.push(`full text[sb]`);
  }

  // publication types с поддержкой AND/OR
  if (filters.publicationTypes?.length) {
    const logic = filters.publicationTypesLogic === "and" ? " AND " : " OR ";
    const pt = filters.publicationTypes.map((t) => `"${t}"[pt]`).join(logic);
    terms.push(`(${pt})`);
  }

  return terms.join(" AND ");
}

type ESearchResp = {
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    webenv?: string;
    querykey?: string;
  };
};

export async function pubmedESearch(args: {
  apiKey?: string;
  topic: string;
  filters: PubMedFilters;
  retmax?: number;
}): Promise<{ webenv: string; queryKey: string; count: number }> {
  const term = buildPubmedTerm(args.topic, args.filters);
  const url = new URL(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
  );
  url.searchParams.set("db", "pubmed");
  url.searchParams.set("term", term);
  url.searchParams.set("retmode", "json");
  url.searchParams.set("usehistory", "y");
  url.searchParams.set("retmax", String(args.retmax ?? 0)); // 0 -> только count + history

  if (args.filters.publishedFrom)
    url.searchParams.set("mindate", args.filters.publishedFrom);
  if (args.filters.publishedTo)
    url.searchParams.set("maxdate", args.filters.publishedTo);
  if (args.filters.publishedFrom || args.filters.publishedTo) {
    url.searchParams.set("datetype", "pdat");
  }

  if (args.apiKey) url.searchParams.set("api_key", args.apiKey);

  const data = await resilientFetchJson<ESearchResp>(url.toString(), {
    apiName: "pubmed",
    retry: { maxRetries: 3 },
    timeoutMs: 30000,
  });
  const webenv = data.esearchresult.webenv;
  const queryKey = data.esearchresult.querykey;
  if (!webenv || !queryKey) {
    throw new Error("PubMed esearch did not return webenv/querykey");
  }
  const count = Number(data.esearchresult.count);
  return { webenv, queryKey, count };
}

export async function pubmedEFetchBatch(args: {
  apiKey?: string;
  webenv: string;
  queryKey: string;
  retstart: number;
  retmax: number;
  throttleMs?: number;
}): Promise<PubMedArticle[]> {
  const url = new URL(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
  );
  url.searchParams.set("db", "pubmed");
  url.searchParams.set("query_key", args.queryKey);
  url.searchParams.set("WebEnv", args.webenv);
  url.searchParams.set("retstart", String(args.retstart));
  url.searchParams.set("retmax", String(args.retmax));
  url.searchParams.set("retmode", "xml");

  if (args.apiKey) url.searchParams.set("api_key", args.apiKey);

  if (args.throttleMs) await sleep(args.throttleMs);

  const res = await resilientFetch(url.toString(), {
    apiName: "pubmed",
    retry: { maxRetries: 3 },
    timeoutMs: 60000, // Longer timeout for batch fetches
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PubMed efetch HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false });
  const obj = parser.parse(xml);

  const articles = obj?.PubmedArticleSet?.PubmedArticle ?? [];
  const arr = Array.isArray(articles) ? articles : [articles];

  const out: PubMedArticle[] = [];

  for (const a of arr) {
    try {
      const mc = a?.MedlineCitation;
      const art = mc?.Article;
      const pmid = String(mc?.PMID?.["#text"] ?? mc?.PMID ?? "").trim();
      if (!pmid) continue;

      const title = decodeHtmlEntities(
        String(art?.ArticleTitle ?? "")
          .replace(/\s+/g, " ")
          .trim(),
      );

      let abstract = "";
      const abs = art?.Abstract?.AbstractText;
      type AbstractTextItem = string | { "#text"?: string };
      if (Array.isArray(abs))
        abstract = abs
          .map((x: AbstractTextItem) =>
            typeof x === "string" ? x : (x?.["#text"] ?? ""),
          )
          .join(" ");
      else if (typeof abs === "string") abstract = abs;
      else if (abs?.["#text"]) abstract = abs["#text"];
      abstract = decodeHtmlEntities(abstract.replace(/\s+/g, " ").trim());

      // year
      const yearStr =
        art?.Journal?.JournalIssue?.PubDate?.Year ??
        art?.ArticleDate?.Year ??
        undefined;
      const year = yearStr ? Number(yearStr) : undefined;

      // authors - decode HTML entities in names
      const authList = art?.AuthorList?.Author;
      let authors = "";
      if (Array.isArray(authList)) {
        authors = authList
          .map((au: PubMedAuthor) => {
            const ln = decodeHtmlEntities(String(au?.LastName ?? ""));
            const ini = decodeHtmlEntities(String(au?.Initials ?? ""));
            return `${ln} ${ini}`.trim();
          })
          .filter(Boolean)
          .join(", ");
      }

      // DOI
      const ids = a?.PubmedData?.ArticleIdList?.ArticleId;
      let doi: string | undefined;
      const idsArr = Array.isArray(ids) ? ids : ids ? [ids] : [];
      for (const id of idsArr) {
        if (id?.["@_IdType"] === "doi") {
          doi = String(id?.["#text"] ?? id)
            .trim()
            .toLowerCase();
        }
      }

      const urlPubmed = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

      out.push({
        pmid,
        doi,
        title,
        abstract: abstract || undefined,
        authors: authors || undefined,
        journal: String(art?.Journal?.Title ?? "").trim() || undefined,
        year: Number.isFinite(year) ? year : undefined,
        url: urlPubmed,
        studyTypes: [], // заполним позже по вашей модели, сейчас пусто
      });
    } catch (err) {
      const sourceId = a?.MedlineCitation?.PMID;
      const pmid =
        typeof sourceId === "object"
          ? String(sourceId?.["#text"] ?? "").trim()
          : String(sourceId ?? "").trim();
      log.warn("Skipping malformed PubMed article in efetch batch", {
        pmid: pmid || undefined,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return out;
}

export async function pubmedFetchByPmids(args: {
  pmids: string[];
  apiKey?: string;
  throttleMs?: number;
}): Promise<PubMedArticle[]> {
  if (!args.pmids.length) return [];

  // Check cache for each PMID
  const cachedArticles: PubMedArticle[] = [];
  const uncachedPmids: string[] = [];

  for (const pmid of args.pmids) {
    const cached = await cacheGet<PubMedArticle>(CACHE_KEYS.pubmed(pmid));
    if (cached) {
      cachedArticles.push(cached);
    } else {
      uncachedPmids.push(pmid);
    }
  }

  // If all cached, return immediately
  if (uncachedPmids.length === 0) {
    return cachedArticles;
  }

  const url = new URL(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
  );
  url.searchParams.set("db", "pubmed");
  url.searchParams.set("id", uncachedPmids.join(","));
  url.searchParams.set("retmode", "xml");

  if (args.apiKey) url.searchParams.set("api_key", args.apiKey);
  if (args.throttleMs) await sleep(args.throttleMs);

  const res = await resilientFetch(url.toString(), {
    apiName: "pubmed",
    retry: { maxRetries: 2 },
    timeoutMs: 30000,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `PubMed efetch by pmid HTTP ${res.status}: ${text.slice(0, 200)}`,
    );
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const obj = parser.parse(xml);

  const articles = obj?.PubmedArticleSet?.PubmedArticle ?? [];
  const arr = Array.isArray(articles) ? articles : [articles];

  const fetchedArticles: PubMedArticle[] = [];

  for (const a of arr) {
    try {
      const mc = a?.MedlineCitation;
      const art = mc?.Article;
      const pmid = String(mc?.PMID?.["#text"] ?? mc?.PMID ?? "").trim();
      if (!pmid) continue;

      const title = decodeHtmlEntities(
        String(art?.ArticleTitle ?? "")
          .replace(/\s+/g, " ")
          .trim(),
      );

      let abstract = "";
      const abs = art?.Abstract?.AbstractText;
      type AbstractTextItem2 = string | { "#text"?: string };
      if (Array.isArray(abs))
        abstract = abs
          .map((x: AbstractTextItem2) =>
            typeof x === "string" ? x : (x?.["#text"] ?? ""),
          )
          .join(" ");
      else if (typeof abs === "string") abstract = abs;
      else if (abs?.["#text"]) abstract = abs["#text"];
      abstract = decodeHtmlEntities(abstract.replace(/\s+/g, " ").trim());

      const yearStr =
        art?.Journal?.JournalIssue?.PubDate?.Year ??
        art?.ArticleDate?.Year ??
        undefined;
      const year = yearStr ? Number(yearStr) : undefined;

      const authList = art?.AuthorList?.Author;
      let authors = "";
      if (Array.isArray(authList)) {
        authors = authList
          .map((au: PubMedAuthor) => {
            const ln = decodeHtmlEntities(String(au?.LastName ?? ""));
            const ini = decodeHtmlEntities(String(au?.Initials ?? ""));
            return `${ln} ${ini}`.trim();
          })
          .filter(Boolean)
          .join(", ");
      }

      const ids = a?.PubmedData?.ArticleIdList?.ArticleId;
      let doi: string | undefined;
      const idsArr = Array.isArray(ids) ? ids : ids ? [ids] : [];
      for (const id of idsArr) {
        if (id?.["@_IdType"] === "doi") {
          doi = String(id?.["#text"] ?? id)
            .trim()
            .toLowerCase();
        }
      }

      const urlPubmed = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

      const article: PubMedArticle = {
        pmid,
        doi,
        title,
        abstract: abstract || undefined,
        authors: authors || undefined,
        journal: String(art?.Journal?.Title ?? "").trim() || undefined,
        year: Number.isFinite(year) ? year : undefined,
        url: urlPubmed,
        studyTypes: [],
      };

      fetchedArticles.push(article);

      // Cache each article for 24 hours
      cacheSet(CACHE_KEYS.pubmed(pmid), article, TTL.EXTERNAL_API).catch(
        (err) => {
          log.warn("Failed to cache PubMed article", {
            pmid,
            error: err instanceof Error ? err.message : String(err),
          });
        },
      );
    } catch (err) {
      const sourceId = a?.MedlineCitation?.PMID;
      const pmid =
        typeof sourceId === "object"
          ? String(sourceId?.["#text"] ?? "").trim()
          : String(sourceId ?? "").trim();
      log.warn("Skipping malformed PubMed article in efetch by pmids", {
        pmid: pmid || undefined,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Combine cached and fetched articles
  return [...cachedArticles, ...fetchedArticles];
}

export async function pubmedFetchAll(args: {
  apiKey?: string;
  topic: string;
  filters: PubMedFilters;
  batchSize?: number;
  throttleMs?: number;
  maxTotal?: number; // safety
}): Promise<{ count: number; items: PubMedArticle[] }> {
  const { webenv, queryKey, count } = await pubmedESearch({
    apiKey: args.apiKey,
    topic: args.topic,
    filters: args.filters,
  });

  const batchSize = args.batchSize ?? 200;
  const maxTotal = args.maxTotal ?? 10000;

  const items: PubMedArticle[] = [];
  const total = Math.min(count, maxTotal);

  for (let start = 0; start < total; start += batchSize) {
    const batch = await pubmedEFetchBatch({
      apiKey: args.apiKey,
      webenv,
      queryKey,
      retstart: start,
      retmax: Math.min(batchSize, total - start),
      throttleMs: args.throttleMs ?? 120,
    });
    items.push(...batch);
  }

  return { count, items };
}

/**
 * Получение связей (references) между статьями через PubMed eLink API
 * Возвращает PMID статей, на которые ссылается данная статья (cited references)
 * и статьи, которые её цитируют (citing articles)
 */
export type PubMedReferences = {
  pmid: string;
  references: string[]; // PMIDs статей, на которые ссылается (исходящие)
  citedBy: string[]; // PMIDs статей, которые цитируют (входящие)
};

/**
 * Fetch with retry and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      // If rate limited (429) or server error (5xx), retry
      if (response.status === 429 || response.status >= 500) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        log.info(
          `HTTP ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await sleep(delay);
        continue;
      }
      // For other errors, don't retry
      return response;
    } catch (err) {
      lastError = err as Error;
      const delay = baseDelayMs * Math.pow(2, attempt);
      log.warn(
        `Network error: ${(err as Error).message}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
      );
      await sleep(delay);
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export async function pubmedGetReferences(args: {
  apiKey?: string;
  pmids: string[];
  throttleMs?: number;
  onProgress?: (processed: number, total: number) => Promise<void>;
  checkCancelled?: () => Promise<boolean>;
}): Promise<PubMedReferences[]> {
  if (args.pmids.length === 0) return [];

  const results: PubMedReferences[] = [];
  const parser = new XMLParser({ ignoreAttributes: false });

  // Обрабатываем батчами по 50 (меньше чем 100 для стабильности)
  const BATCH_SIZE = 50;

  let totalRefs = 0;
  let totalCitedBy = 0;

  for (let i = 0; i < args.pmids.length; i += BATCH_SIZE) {
    // Проверяем отмену перед каждым батчем
    if (args.checkCancelled && (await args.checkCancelled())) {
      log.info(`eLink job cancelled, stopping at batch ${i}`);
      break;
    }

    const batch = args.pmids.slice(i, i + BATCH_SIZE);

    // Получаем исходящие ссылки (references) - pubmed_pubmed_refs
    const refsUrl = new URL(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi",
    );
    refsUrl.searchParams.set("dbfrom", "pubmed");
    refsUrl.searchParams.set("db", "pubmed");
    refsUrl.searchParams.set("linkname", "pubmed_pubmed_refs");
    refsUrl.searchParams.set("retmode", "xml");
    batch.forEach((pmid) => refsUrl.searchParams.append("id", pmid));
    if (args.apiKey) refsUrl.searchParams.set("api_key", args.apiKey);

    // Получаем входящие ссылки (cited by) - pubmed_pubmed_citedin
    const citedByUrl = new URL(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi",
    );
    citedByUrl.searchParams.set("dbfrom", "pubmed");
    citedByUrl.searchParams.set("db", "pubmed");
    citedByUrl.searchParams.set("linkname", "pubmed_pubmed_citedin");
    citedByUrl.searchParams.set("retmode", "xml");
    batch.forEach((pmid) => citedByUrl.searchParams.append("id", pmid));
    if (args.apiKey) citedByUrl.searchParams.set("api_key", args.apiKey);

    try {
      // Выполняем запросы последовательно с retry для стабильности
      const refsRes = await fetchWithRetry(refsUrl.toString());
      if (args.throttleMs) await sleep(args.throttleMs / 2);

      const citedByRes = await fetchWithRetry(citedByUrl.toString());

      if (!refsRes.ok || !citedByRes.ok) {
        log.error(
          `eLink HTTP error: refs=${refsRes.status}, citedBy=${citedByRes.status}`,
        );
        // Still add empty results for batch so we don't lose progress
        for (const pmid of batch) {
          results.push({ pmid, references: [], citedBy: [] });
        }
        continue;
      }

      const [refsXml, citedByXml] = await Promise.all([
        refsRes.text(),
        citedByRes.text(),
      ]);

      const refsData = parser.parse(refsXml);
      const citedByData = parser.parse(citedByXml);

      // Парсим результаты
      const refsMap = parseElinkResults(refsData);
      const citedByMap = parseElinkResults(citedByData);

      // Логируем статистику для батча
      let batchRefs = 0;
      let batchCitedBy = 0;

      // Собираем результаты для каждого PMID в батче
      for (const pmid of batch) {
        const refs = refsMap.get(pmid) || [];
        const citedBy = citedByMap.get(pmid) || [];
        batchRefs += refs.length;
        batchCitedBy += citedBy.length;
        results.push({
          pmid,
          references: refs,
          citedBy: citedBy,
        });
      }

      totalRefs += batchRefs;
      totalCitedBy += batchCitedBy;

      // Логируем прогресс каждый батч
      if (i % 100 === 0 || i + BATCH_SIZE >= args.pmids.length) {
        log.info(
          `eLink batch ${i}-${Math.min(i + BATCH_SIZE, args.pmids.length)}/${args.pmids.length}: ${batchRefs} refs, ${batchCitedBy} citedBy`,
        );
      }

      // Вызываем callback прогресса
      if (args.onProgress) {
        await args.onProgress(
          Math.min(i + BATCH_SIZE, args.pmids.length),
          args.pmids.length,
        );
      }

      if (args.throttleMs) await sleep(args.throttleMs);
    } catch (err) {
      log.error("eLink fetch error after retries", err as Error);
      // Add empty results for batch so we don't lose progress
      for (const pmid of batch) {
        results.push({ pmid, references: [], citedBy: [] });
      }

      // Всё равно обновляем прогресс
      if (args.onProgress) {
        await args.onProgress(
          Math.min(i + BATCH_SIZE, args.pmids.length),
          args.pmids.length,
        );
      }
    }
  }

  log.info(
    `eLink total: ${totalRefs} references, ${totalCitedBy} citedBy for ${args.pmids.length} articles`,
  );

  return results;
}

function parseElinkResults(data: unknown): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const elinkData = data as ElinkResponse;

  const linkSets = elinkData?.eLinkResult?.LinkSet;
  if (!linkSets) return result;

  const sets = Array.isArray(linkSets) ? linkSets : [linkSets];

  for (const set of sets) {
    // IdList содержит исходный PMID
    const sourceId = set?.IdList?.Id;
    const sourcePmid =
      typeof sourceId === "object" ? sourceId["#text"] : String(sourceId || "");

    if (!sourcePmid) continue;

    // LinkSetDb содержит связанные статьи
    const linkDb = set?.LinkSetDb;
    if (!linkDb) {
      result.set(sourcePmid, []);
      continue;
    }

    const links = linkDb?.Link;
    if (!links) {
      result.set(sourcePmid, []);
      continue;
    }

    const linksArr = Array.isArray(links) ? links : [links];
    const pmids: string[] = [];

    for (const link of linksArr) {
      const id = link?.Id;
      const pmid = typeof id === "object" ? id["#text"] : String(id || "");
      if (pmid && pmid !== sourcePmid) {
        pmids.push(pmid);
      }
    }

    result.set(sourcePmid, pmids);
  }

  return result;
}

/**
 * Обогатить статьи данными о references
 */
export async function enrichArticlesWithReferences(args: {
  apiKey?: string;
  pmids: string[];
  throttleMs?: number;
  onProgress?: (processed: number, total: number) => Promise<void>;
  checkCancelled?: () => Promise<boolean>;
}): Promise<Map<string, PubMedReferences>> {
  const refs = await pubmedGetReferences(args);
  const map = new Map<string, PubMedReferences>();
  for (const r of refs) {
    map.set(r.pmid, r);
  }
  return map;
}

// ============ Europe PMC Integration ============

export type EuropePMCCitation = {
  pmid: string;
  citedByCount: number;
};

/**
 * Получить количество цитирований статьи из Europe PMC
 * Europe PMC агрегирует данные из PubMed Central, Europe PMC и других источников
 */
export async function europePMCGetCitationCount(pmid: string): Promise<number> {
  try {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/MED/${pmid}/citations?format=json&pageSize=1`;
    const response = await fetch(url);
    if (!response.ok) return 0;

    const data = (await response.json()) as { hitCount?: number };
    return data?.hitCount || 0;
  } catch {
    return 0;
  }
}

/**
 * Получить количество цитирований для нескольких статей из Europe PMC (батчами)
 */
export async function europePMCGetCitationCounts(args: {
  pmids: string[];
  throttleMs?: number;
}): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  // Europe PMC не поддерживает батчевые запросы, поэтому делаем по одному
  for (const pmid of args.pmids) {
    try {
      const count = await europePMCGetCitationCount(pmid);
      result.set(pmid, count);

      if (args.throttleMs) await sleep(args.throttleMs);
    } catch {
      result.set(pmid, 0);
    }
  }

  return result;
}
