export type ArticleIdentity = {
  pmid?: string | null;
  doi?: string | null;
  title?: string | null;
  year?: number | null;
  authors?: string | string[] | null;
  source?: string;
  raw?: unknown;
};

export type DedupOptions = {
  enableSoft?: boolean;
};

export type DedupResult<T extends ArticleIdentity> = {
  unique: T[];
  duplicates: T[];
  mergeMap: Map<T, T>;
};

export function normalizeDoi(doi?: string | null): string | null {
  if (!doi) return null;
  return (
    doi
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/doi\.org\//, "")
      .replace(/^doi:/, "")
      .trim() || null
  );
}

function normalizeTitle(title?: string | null): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstAuthor(authors?: string | string[] | null): string {
  if (!authors) return "";
  if (Array.isArray(authors)) return authors[0]?.toLowerCase().trim() || "";
  return authors.split(",")[0]?.toLowerCase().trim() || "";
}

function softKey(item: ArticleIdentity): string {
  const title = normalizeTitle(item.title);
  const author = firstAuthor(item.authors);
  const year = item.year ?? "";
  return `${title}|${year}|${author}`;
}

export function dedupArticles<T extends ArticleIdentity>(
  items: T[],
  options: DedupOptions = {},
): DedupResult<T> {
  const unique: T[] = [];
  const duplicates: T[] = [];
  const mergeMap = new Map<T, T>();
  const seenPmids = new Set<string>();
  const seenDois = new Set<string>();
  const seenSoft = new Set<string>();

  for (const item of items) {
    const normalizedDoi = normalizeDoi(item.doi);
    const pmid = item.pmid?.trim();

    if (pmid && seenPmids.has(pmid)) {
      duplicates.push(item);
      continue;
    }
    if (pmid) seenPmids.add(pmid);

    if (normalizedDoi) {
      if (seenDois.has(normalizedDoi)) {
        duplicates.push(item);
        continue;
      }
      seenDois.add(normalizedDoi);
    }

    if (options.enableSoft) {
      const key = softKey(item);
      if (key && seenSoft.has(key)) {
        duplicates.push(item);
        continue;
      }
      if (key) seenSoft.add(key);
    }

    unique.push({ ...item, doi: normalizedDoi ?? item.doi } as T);
    mergeMap.set(item, item);
  }

  return { unique, duplicates, mergeMap };
}
