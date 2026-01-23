/**
 * Типы данных для фоновых задач (pg-boss jobs)
 */

/**
 * Payload для PubMed search job
 */
export interface PubmedSearchJobPayload {
  projectId: string;
  queryId: string;
}

/**
 * Payload для Graph fetch job (построение графа связей)
 */
export interface GraphFetchJobPayload {
  projectId: string;
  userId: string;
  jobId?: string;
  selectedOnly?: boolean;
  /** Конкретные ID статей для обработки (опционально) */
  articleIds?: string[] | null;
}

/**
 * Статус прогресса job
 */
export interface JobProgress {
  processedArticles?: number;
  fetchedPmids?: number;
  totalPmidsToFetch?: number;
  phase?: string;
  phaseProgress?: string;
}

/**
 * Type guard для проверки PubmedSearchJobPayload
 */
export function isPubmedSearchPayload(data: unknown): data is PubmedSearchJobPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    'projectId' in data &&
    'queryId' in data &&
    typeof (data as PubmedSearchJobPayload).projectId === 'string' &&
    typeof (data as PubmedSearchJobPayload).queryId === 'string'
  );
}

/**
 * Type guard для проверки GraphFetchJobPayload
 */
export function isGraphFetchPayload(data: unknown): data is GraphFetchJobPayload & { jobId: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'projectId' in data &&
    'userId' in data &&
    'jobId' in data &&
    typeof (data as GraphFetchJobPayload).projectId === 'string' &&
    typeof (data as GraphFetchJobPayload).userId === 'string' &&
    typeof (data as GraphFetchJobPayload).jobId === 'string'
  );
}
