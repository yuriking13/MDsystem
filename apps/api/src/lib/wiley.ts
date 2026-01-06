/**
 * Wiley Online Library API integration
 * Uses CrossRef API to search Wiley-published articles
 * 
 * Wiley doesn't have a public search API, so we use CrossRef
 * with the Wiley member ID filter (member:311)
 */

import { sleep } from './http.js';

export type WileyFilters = {
  publishedFrom?: string; // YYYY-MM-DD
  publishedTo?: string;   // YYYY-MM-DD
  journals?: string[];    // Journal titles or ISSNs
};

export type WileyArticle = {
  doi: string;
  title: string;
  abstract?: string;
  authors?: string;
  journal?: string;
  year?: number;
  url: string;
};

export type WileySearchResult = {
  total: number;
  items: WileyArticle[];
};

/**
 * Search Wiley articles via CrossRef API
 * CrossRef member ID for Wiley: 311
 */
export async function wileySearch(args: {
  topic: string;
  filters: WileyFilters;
  offset?: number;
  rows?: number;
  throttleMs?: number;
}): Promise<WileySearchResult> {
  const { topic, filters, offset = 0, rows = 100 } = args;
  
  if (args.throttleMs) await sleep(args.throttleMs);
  
  // Build CrossRef API URL
  const params = new URLSearchParams();
  params.set('query', topic);
  params.set('filter', 'member:311'); // Wiley member ID
  params.set('rows', String(rows));
  params.set('offset', String(offset));
  
  // Date filters
  if (filters.publishedFrom) {
    params.append('filter', `from-pub-date:${filters.publishedFrom}`);
  }
  if (filters.publishedTo) {
    params.append('filter', `until-pub-date:${filters.publishedTo}`);
  }
  
  const url = `https://api.crossref.org/works?${params.toString()}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MedSystem/1.0 (mailto:support@medsystem.app)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`CrossRef API error: HTTP ${response.status}`);
    }
    
    const data: any = await response.json();
    const message = data.message || {};
    
    const items: WileyArticle[] = (message.items || []).map((item: any) => {
      // Extract authors
      let authors = '';
      if (Array.isArray(item.author)) {
        authors = item.author
          .map((a: any) => `${a.family || ''} ${a.given?.[0] || ''}`.trim())
          .filter(Boolean)
          .join(', ');
      }
      
      // Extract year
      let year: number | undefined;
      const pubDate = item.published?.['date-parts']?.[0];
      if (Array.isArray(pubDate) && pubDate[0]) {
        year = parseInt(pubDate[0], 10);
        if (isNaN(year)) year = undefined;
      }
      
      // Extract title
      let title = '(no title)';
      if (Array.isArray(item.title) && item.title[0]) {
        title = item.title[0];
      } else if (typeof item.title === 'string') {
        title = item.title;
      }
      
      // Extract abstract (CrossRef may not always have it)
      let abstract: string | undefined;
      if (item.abstract) {
        // Remove JATS tags if present
        abstract = item.abstract
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      // Get journal name
      let journal: string | undefined;
      if (Array.isArray(item['container-title']) && item['container-title'][0]) {
        journal = item['container-title'][0];
      }
      
      return {
        doi: item.DOI || '',
        title,
        abstract,
        authors: authors || undefined,
        journal,
        year,
        url: item.URL || `https://doi.org/${item.DOI}`,
      };
    });
    
    return {
      total: message['total-results'] || 0,
      items,
    };
  } catch (error: any) {
    console.error('[Wiley] Search error:', error.message);
    throw error;
  }
}

/**
 * Fetch all Wiley articles (with pagination)
 */
export async function wileyFetchAll(args: {
  topic: string;
  filters: WileyFilters;
  batchSize?: number;
  throttleMs?: number;
  maxTotal?: number;
}): Promise<{ count: number; items: WileyArticle[] }> {
  const { topic, filters, batchSize = 100, throttleMs = 500, maxTotal = 500 } = args;
  
  // First request to get total count
  const firstResult = await wileySearch({
    topic,
    filters,
    offset: 0,
    rows: Math.min(batchSize, maxTotal),
    throttleMs,
  });
  
  const totalToFetch = Math.min(firstResult.total, maxTotal);
  const allItems = [...firstResult.items];
  
  // Fetch remaining batches if needed
  if (totalToFetch > batchSize) {
    for (let offset = batchSize; offset < totalToFetch && allItems.length < maxTotal; offset += batchSize) {
      const result = await wileySearch({
        topic,
        filters,
        offset,
        rows: Math.min(batchSize, maxTotal - allItems.length),
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
