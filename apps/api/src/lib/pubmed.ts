import { XMLParser } from 'fast-xml-parser';
import { fetchJson, sleep } from './http.js';

export type PubMedFilters = {
  publishedFrom?: string; // YYYY-MM-DD
  publishedTo?: string;   // YYYY-MM-DD
  freeFullTextOnly?: boolean;
  publicationTypes?: string[]; // e.g. ["Systematic Review", "Meta-Analysis"]
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

function encodeTerm(term: string): string {
  return encodeURIComponent(term);
}

function buildPubmedTerm(topic: string, filters: PubMedFilters): string {
  const terms: string[] = [];

  // базовая тема
  terms.push(`(${topic})`);

  // free full text
  if (filters.freeFullTextOnly) {
    terms.push(`free full text[sb]`);
  }

  // publication types
  if (filters.publicationTypes?.length) {
    const pt = filters.publicationTypes
      .map((t) => `"${t}"[pt]`)
      .join(' OR ');
    terms.push(`(${pt})`);
  }

  return terms.join(' AND ');
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
  const url = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
  url.searchParams.set('db', 'pubmed');
  url.searchParams.set('term', term);
  url.searchParams.set('retmode', 'json');
  url.searchParams.set('usehistory', 'y');
  url.searchParams.set('retmax', String(args.retmax ?? 0)); // 0 -> только count + history

  if (args.filters.publishedFrom) url.searchParams.set('mindate', args.filters.publishedFrom);
  if (args.filters.publishedTo) url.searchParams.set('maxdate', args.filters.publishedTo);
  if (args.filters.publishedFrom || args.filters.publishedTo) {
    url.searchParams.set('datetype', 'pdat');
  }

  if (args.apiKey) url.searchParams.set('api_key', args.apiKey);

  const data = await fetchJson<ESearchResp>(url.toString());
  const webenv = data.esearchresult.webenv;
  const queryKey = data.esearchresult.querykey;
  if (!webenv || !queryKey) {
    throw new Error('PubMed esearch did not return webenv/querykey');
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
  const url = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi');
  url.searchParams.set('db', 'pubmed');
  url.searchParams.set('query_key', args.queryKey);
  url.searchParams.set('WebEnv', args.webenv);
  url.searchParams.set('retstart', String(args.retstart));
  url.searchParams.set('retmax', String(args.retmax));
  url.searchParams.set('retmode', 'xml');

  if (args.apiKey) url.searchParams.set('api_key', args.apiKey);

  if (args.throttleMs) await sleep(args.throttleMs);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
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
      const pmid = String(mc?.PMID?.['#text'] ?? mc?.PMID ?? '').trim();
      if (!pmid) continue;

      const title = String(art?.ArticleTitle ?? '').replace(/\s+/g, ' ').trim();

      let abstract = '';
      const abs = art?.Abstract?.AbstractText;
      if (Array.isArray(abs)) abstract = abs.map((x: any) => (typeof x === 'string' ? x : x?.['#text'] ?? '')).join(' ');
      else if (typeof abs === 'string') abstract = abs;
      else if (abs?.['#text']) abstract = abs['#text'];
      abstract = abstract.replace(/\s+/g, ' ').trim();

      // year
      const yearStr = art?.Journal?.JournalIssue?.PubDate?.Year
        ?? art?.ArticleDate?.Year
        ?? undefined;
      const year = yearStr ? Number(yearStr) : undefined;

      // authors
      const authList = art?.AuthorList?.Author;
      let authors = '';
      if (Array.isArray(authList)) {
        authors = authList
          .map((au: any) => {
            const ln = au?.LastName ?? '';
            const ini = au?.Initials ?? '';
            return String(`${ln} ${ini}`.trim());
          })
          .filter(Boolean)
          .join(', ');
      }

      // DOI
      const ids = a?.PubmedData?.ArticleIdList?.ArticleId;
      let doi: string | undefined;
      const idsArr = Array.isArray(ids) ? ids : (ids ? [ids] : []);
      for (const id of idsArr) {
        if (id?.['@_IdType'] === 'doi') {
          doi = String(id?.['#text'] ?? id).trim().toLowerCase();
        }
      }

      const urlPubmed = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

      out.push({
        pmid,
        doi,
        title,
        abstract: abstract || undefined,
        authors: authors || undefined,
        journal: String(art?.Journal?.Title ?? '').trim() || undefined,
        year: Number.isFinite(year) ? year : undefined,
        url: urlPubmed,
        studyTypes: [] // заполним позже по вашей модели, сейчас пусто
      });
    } catch {
      // skip bad article
    }
  }

  return out;
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
    filters: args.filters
  });

  const batchSize = args.batchSize ?? 200;
  const maxTotal = args.maxTotal ?? 2000;

  const items: PubMedArticle[] = [];
  const total = Math.min(count, maxTotal);

  for (let start = 0; start < total; start += batchSize) {
    const batch = await pubmedEFetchBatch({
      apiKey: args.apiKey,
      webenv,
      queryKey,
      retstart: start,
      retmax: Math.min(batchSize, total - start),
      throttleMs: args.throttleMs ?? 120
    });
    items.push(...batch);
  }

  return { count, items };
}
