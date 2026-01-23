/**
 * DOAJ (Directory of Open Access Journals) API integration
 * API Documentation: https://doaj.org/api/v3/docs
 * 
 * DOAJ is a community-curated index of open access journals.
 * All articles indexed in DOAJ are open access.
 */

import { sleep } from './http.js';

export type DOAJFilters = {
  publishedFrom?: string; // YYYY-MM-DD
  publishedTo?: string;   // YYYY-MM-DD
  journals?: string[];    // Journal titles or ISSNs
  subjects?: string[];    // Subject keywords
};

export type DOAJArticle = {
  id: string;
  doi?: string;
  title: string;
  abstract?: string;
  authors?: string;
  journal?: string;
  year?: number;
  url: string;
  keywords?: string[];
};

export type DOAJSearchResult = {
  total: number;
  items: DOAJArticle[];
};

/**
 * Build DOAJ search query
 * DOAJ uses Elasticsearch-like query syntax
 */
function buildDOAJQuery(topic: string, filters: DOAJFilters): string {
  const parts: string[] = [];
  
  // Main search query - search in title and abstract
  parts.push(`(bibjson.title:"${topic}" OR bibjson.abstract:"${topic}")`);
  
  // Date range filters
  if (filters.publishedFrom || filters.publishedTo) {
    const from = filters.publishedFrom || '1900-01-01';
    const to = filters.publishedTo || new Date().toISOString().split('T')[0];
    // DOAJ uses year in bibjson.year
    const fromYear = from.split('-')[0];
    const toYear = to.split('-')[0];
    parts.push(`bibjson.year:[${fromYear} TO ${toYear}]`);
  }
  
  return parts.join(' AND ');
}

/**
 * Search DOAJ for articles
 */
export async function doajSearch(args: {
  topic: string;
  filters: DOAJFilters;
  page?: number;
  pageSize?: number;
  throttleMs?: number;
}): Promise<DOAJSearchResult> {
  const { topic, filters, page = 1, pageSize = 100 } = args;
  
  if (args.throttleMs) await sleep(args.throttleMs);
  
  // Build search URL
  // DOAJ API v3 search endpoint
  const baseUrl = 'https://doaj.org/api/search/articles';
  const query = encodeURIComponent(buildDOAJQuery(topic, filters));
  const url = `${baseUrl}/${query}?page=${page}&pageSize=${pageSize}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`DOAJ API error: HTTP ${response.status}`);
    }
    
    const data: any = await response.json();
    
    const items: DOAJArticle[] = (data.results || []).map((result: any) => {
      const bib = result.bibjson || {};
      
      // Extract authors
      let authors = '';
      if (Array.isArray(bib.author)) {
        authors = bib.author
          .map((a: any) => a.name || `${a.family || ''} ${a.given || ''}`.trim())
          .filter(Boolean)
          .join(', ');
      }
      
      // Extract DOI from identifiers
      let doi: string | undefined;
      if (Array.isArray(bib.identifier)) {
        const doiObj = bib.identifier.find((id: any) => id.type === 'doi');
        if (doiObj) {
          doi = doiObj.id?.replace('https://doi.org/', '').toLowerCase();
        }
      }
      
      // Get article URL - prefer DOI, then link
      let articleUrl = doi ? `https://doi.org/${doi}` : '';
      if (!articleUrl && Array.isArray(bib.link)) {
        const fulltext = bib.link.find((l: any) => l.type === 'fulltext');
        if (fulltext) articleUrl = fulltext.url;
      }
      
      // Extract year
      let year: number | undefined;
      if (bib.year) {
        year = parseInt(bib.year, 10);
        if (isNaN(year)) year = undefined;
      }
      
      // Extract keywords
      let keywords: string[] = [];
      if (Array.isArray(bib.keywords)) {
        keywords = bib.keywords;
      }
      
      return {
        id: result.id || '',
        doi,
        title: bib.title || '(no title)',
        abstract: bib.abstract || undefined,
        authors: authors || undefined,
        journal: bib.journal?.title || undefined,
        year,
        url: articleUrl || `https://doaj.org/article/${result.id}`,
        keywords,
      };
    });
    
    return {
      total: data.total || 0,
      items,
    };
  } catch (error: any) {
    console.error('[DOAJ] Search error:', error.message);
    throw error;
  }
}

/**
 * Fetch all articles from DOAJ (with pagination)
 */
export async function doajFetchAll(args: {
  topic: string;
  filters: DOAJFilters;
  batchSize?: number;
  throttleMs?: number;
  maxTotal?: number;
}): Promise<{ count: number; items: DOAJArticle[] }> {
  const { topic, filters, batchSize = 100, throttleMs = 500, maxTotal = 500 } = args;
  
  // First request to get total count
  const firstResult = await doajSearch({
    topic,
    filters,
    page: 1,
    pageSize: Math.min(batchSize, maxTotal),
    throttleMs,
  });
  
  const totalToFetch = Math.min(firstResult.total, maxTotal);
  const allItems = [...firstResult.items];
  
  // Fetch remaining pages if needed
  if (totalToFetch > batchSize) {
    const totalPages = Math.ceil(totalToFetch / batchSize);
    
    for (let page = 2; page <= totalPages && allItems.length < maxTotal; page++) {
      const result = await doajSearch({
        topic,
        filters,
        page,
        pageSize: batchSize,
        throttleMs,
      });
      
      allItems.push(...result.items);
      
      if (result.items.length === 0) break;
    }
  }
  
  return {
    count: firstResult.total,
    items: allItems.slice(0, maxTotal),
  };
}
