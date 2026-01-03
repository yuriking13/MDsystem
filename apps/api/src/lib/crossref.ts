import { fetchJson, sleep } from './http.js';

export type CrossrefFilters = {
  fromYear?: number;
  untilYear?: number;
  // В Crossref нет прямого "free full text only" фильтра на все случаи —
  // будем использовать это позже по полю link/license/open-access (если доступно).
};

type CrossrefResp = {
  message: {
    items: Array<{
      DOI?: string;
      title?: string[];
      issued?: { 'date-parts'?: number[][] };
      URL?: string;
      container-title?: string[];
      author?: Array<{ family?: string; given?: string }>;
      abstract?: string;
      type?: string;
      link?: Array<{ URL?: string; 'content-type'?: string; 'intended-application'?: string }>;
    }>;
    'total-results': number;
  };
};

export type CrossrefWork = {
  doi?: string;
  title: string;
  year?: number;
  url?: string;
  authors?: string;
  journal?: string;
  abstract?: string;
  source: 'crossref';
};

export async function crossrefSearch(args: {
  query: string;
  mailto?: string;
  rows?: number;
  offset?: number;
  throttleMs?: number;
}): Promise<{ total: number; items: CrossrefWork[] }> {
  const url = new URL('https://api.crossref.org/works');
  url.searchParams.set('query', args.query);
  url.searchParams.set('rows', String(args.rows ?? 20));
  url.searchParams.set('offset', String(args.offset ?? 0));
  if (args.mailto) url.searchParams.set('mailto', args.mailto);

  if (args.throttleMs) await sleep(args.throttleMs);

  const data = await fetchJson<CrossrefResp>(url.toString());
  const total = data.message['total-results'] ?? 0;

  const items: CrossrefWork[] = (data.message.items ?? []).map((it) => {
    const doi = it.DOI?.toLowerCase();
    const title = (it.title?.[0] ?? '').trim();
    const year = it.issued?.['date-parts']?.[0]?.[0];
    const authors = it.author?.map((a) => `${a.family ?? ''} ${a.given?.[0] ?? ''}`.trim()).filter(Boolean).join(', ');
    const journal = it['container-title']?.[0];
    const url = it.URL;
    const abstract = it.abstract;

    return {
      doi,
      title,
      year,
      url,
      authors,
      journal,
      abstract,
      source: 'crossref'
    };
  });

  return { total, items };
}
