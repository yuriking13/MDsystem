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
  /** Автопайплайн после поиска: затем запуск embeddings + semantic warmup */
  autoPipeline?: boolean;
}

/**
 * Payload для Embeddings generation job
 */
export interface EmbeddingsJobPayload {
  projectId: string;
  userId: string;
  jobId: string;
  articleIds?: string[] | null;
  includeReferences?: boolean;
  includeCitedBy?: boolean;
  batchSize?: number;
  /** Импортировать недостающие статьи из PubMed/Crossref перед генерацией */
  importMissingArticles?: boolean;
  /** Запущено из авто-пайплайна после поиска */
  autoPipeline?: boolean;
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
export function isPubmedSearchPayload(
  data: unknown,
): data is PubmedSearchJobPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    "projectId" in data &&
    "queryId" in data &&
    typeof (data as PubmedSearchJobPayload).projectId === "string" &&
    typeof (data as PubmedSearchJobPayload).queryId === "string"
  );
}

/**
 * Type guard для проверки GraphFetchJobPayload
 */
export function isGraphFetchPayload(
  data: unknown,
): data is GraphFetchJobPayload & { jobId: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "projectId" in data &&
    "userId" in data &&
    "jobId" in data &&
    typeof (data as GraphFetchJobPayload).projectId === "string" &&
    typeof (data as GraphFetchJobPayload).userId === "string" &&
    typeof (data as GraphFetchJobPayload).jobId === "string"
  );
}

/**
 * Type guard для проверки EmbeddingsJobPayload
 */
export function isEmbeddingsJobPayload(
  data: unknown,
): data is EmbeddingsJobPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    "projectId" in data &&
    "userId" in data &&
    "jobId" in data &&
    typeof (data as EmbeddingsJobPayload).projectId === "string" &&
    typeof (data as EmbeddingsJobPayload).userId === "string" &&
    typeof (data as EmbeddingsJobPayload).jobId === "string"
  );
}
