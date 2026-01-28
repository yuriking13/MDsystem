import { getToken } from "./auth";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

async function readJsonSafe(res: Response): Promise<any> {
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : null;
  } catch {
    return txt;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }

  const auth = init.auth ?? true;
  if (auth) {
    const token = getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const payload = (await readJsonSafe(res)) as
      | ApiErrorPayload
      | string
      | null;
    const msg =
      typeof payload === "string"
        ? payload
        : payload?.message || payload?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

export type AuthUser = { id: string; email: string };
export type AuthResponse = { user: AuthUser; token: string };

export async function apiRegister(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
}

export async function apiMe(): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/api/auth/me");
}

export type ApiKeysResponse = { keys: Record<string, boolean> };

export async function apiGetApiKeys(): Promise<ApiKeysResponse> {
  return apiFetch<ApiKeysResponse>("/api/user/api-keys");
}

export async function apiSaveApiKey(
  provider: string,
  key: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/api/user/api-keys", {
    method: "POST",
    body: JSON.stringify({ provider, key }),
  });
}

export async function apiDeleteApiKey(provider: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/user/api-keys/${encodeURIComponent(provider)}`,
    {
      method: "DELETE",
    },
  );
}

// ========== Projects ==========

export type CitationStyle = "gost-r-7-0-5-2008" | "gost" | "apa" | "vancouver";

export type ResearchType =
  | "observational_descriptive"
  | "observational_analytical"
  | "experimental"
  | "second_order"
  | "other";

export type ResearchProtocol =
  | "CARE"
  | "STROBE"
  | "CONSORT"
  | "PRISMA"
  | "OTHER";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "editor" | "viewer";
  citation_style?: CitationStyle;
  // Тип исследования
  research_type?: ResearchType;
  research_subtype?: string;
  // Протокол исследования
  research_protocol?: ResearchProtocol;
  protocol_custom_name?: string;
  // AI-анализ
  ai_error_analysis_enabled?: boolean;
  ai_protocol_check_enabled?: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectMember = {
  user_id: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  joined_at: string;
};

export async function apiGetProjects(): Promise<{ projects: Project[] }> {
  return apiFetch<{ projects: Project[] }>("/api/projects");
}

export async function apiGetProject(id: string): Promise<{ project: Project }> {
  return apiFetch<{ project: Project }>(`/api/projects/${id}`);
}

export async function apiCreateProject(
  name: string,
  description?: string,
): Promise<{ project: Project }> {
  return apiFetch<{ project: Project }>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export type UpdateProjectData = {
  name?: string;
  description?: string;
  citationStyle?: CitationStyle;
  researchType?: ResearchType;
  researchSubtype?: string;
  researchProtocol?: ResearchProtocol;
  protocolCustomName?: string;
  aiErrorAnalysisEnabled?: boolean;
  aiProtocolCheckEnabled?: boolean;
};

export async function apiUpdateProject(
  id: string,
  data: UpdateProjectData,
): Promise<{ project: Project }> {
  return apiFetch<{ project: Project }>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function apiDeleteProject(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/projects/${id}`, {
    method: "DELETE",
  });
}

export async function apiGetProjectMembers(
  projectId: string,
): Promise<{ members: ProjectMember[] }> {
  return apiFetch<{ members: ProjectMember[] }>(
    `/api/projects/${projectId}/members`,
  );
}

export async function apiInviteProjectMember(
  projectId: string,
  email: string,
  role: "viewer" | "editor" = "viewer",
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function apiRemoveProjectMember(
  projectId: string,
  userId: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/projects/${projectId}/members/${userId}`,
    {
      method: "DELETE",
    },
  );
}

// ========== Articles ==========

export type Article = {
  id: string;
  doi: string | null;
  pmid: string | null;
  title_en: string;
  title_ru: string | null;
  abstract_en: string | null;
  abstract_ru: string | null;
  authors: string[] | null;
  year: number | null;
  journal: string | null;
  url: string;
  source: string;
  has_stats: boolean;
  stats_json: any;
  stats_quality: number; // 0-3, качество статистики по p-value
  publication_types: string[] | null;
  fetched_at: string; // Дата обращения к источнику
  status: "candidate" | "selected" | "excluded" | "deleted";
  notes: string | null;
  tags: string[] | null;
  added_at: string;
  // Import from file support
  source_file_id?: string | null;
  is_from_file?: boolean;
  extracted_bibliography?: ExtractedReference[] | null;
};

export type ArticlesResponse = {
  articles: Article[];
  counts: {
    candidate: number;
    selected: number;
    excluded: number;
    deleted: number;
  };
  total: number;
  searchQueries?: string[]; // Уникальные поисковые запросы для фильтрации
};

// Поля поиска PubMed
export const PUBMED_SEARCH_FIELDS = [
  { value: "All Fields", label: "Все поля", labelEn: "All Fields" },
  { value: "Title", label: "Заголовок", labelEn: "Title" },
  {
    value: "Title/Abstract",
    label: "Заголовок/Аннотация",
    labelEn: "Title/Abstract",
  },
  { value: "Text Word", label: "Текст статьи", labelEn: "Text Word" },
  { value: "Author", label: "Автор", labelEn: "Author" },
  { value: "Author - First", label: "Первый автор", labelEn: "First Author" },
  { value: "Author - Last", label: "Последний автор", labelEn: "Last Author" },
  { value: "Journal", label: "Журнал", labelEn: "Journal" },
  { value: "MeSH Terms", label: "MeSH термины", labelEn: "MeSH Terms" },
  {
    value: "MeSH Major Topic",
    label: "MeSH основная тема",
    labelEn: "MeSH Major Topic",
  },
  { value: "Affiliation", label: "Аффилиация", labelEn: "Affiliation" },
  {
    value: "Publication Type",
    label: "Тип публикации",
    labelEn: "Publication Type",
  },
  { value: "Language", label: "Язык", labelEn: "Language" },
] as const;

// Источники поиска
export type SearchSource = "pubmed" | "doaj" | "wiley";

export const SEARCH_SOURCES: {
  value: SearchSource;
  label: string;
  description: string;
}[] = [
  {
    value: "pubmed",
    label: "PubMed",
    description: "Биомедицинская база данных NIH",
  },
  { value: "doaj", label: "DOAJ", description: "Журналы открытого доступа" },
  { value: "wiley", label: "Wiley", description: "Научное издательство Wiley" },
];

export type SearchFilters = {
  searchField?: string; // Поле поиска PubMed
  yearFrom?: number;
  yearTo?: number;
  freeFullTextOnly?: boolean;
  fullTextOnly?: boolean;
  publicationTypes?: string[];
  publicationTypesLogic?: "or" | "and";
  translate?: boolean;
};

export type SearchResult = {
  totalFound: number;
  fetched: number;
  added: number;
  skipped: number;
  translated?: number;
  sources?: Record<string, { count: number; added: number }>;
  message: string;
};

export async function apiSearchArticles(
  projectId: string,
  query: string,
  filters?: SearchFilters,
  maxResults = 100,
  sources: SearchSource[] = ["pubmed"],
): Promise<SearchResult> {
  return apiFetch<SearchResult>(`/api/projects/${projectId}/search`, {
    method: "POST",
    body: JSON.stringify({ query, filters, maxResults, sources }),
  });
}

// Добавить статью по DOI
export type AddArticleByDoiResult = {
  ok: true;
  articleId: string;
  created: boolean;
  status: "candidate" | "selected";
  message: string;
};

export async function apiAddArticleByDoi(
  projectId: string,
  doi: string,
  status: "candidate" | "selected" = "candidate",
): Promise<AddArticleByDoiResult> {
  return apiFetch<AddArticleByDoiResult>(
    `/api/projects/${projectId}/add-article-by-doi`,
    {
      method: "POST",
      body: JSON.stringify({ doi, status }),
    },
  );
}

export async function apiGetArticles(
  projectId: string,
  status?: "candidate" | "selected" | "excluded" | "deleted",
  hasStats?: boolean,
  sourceQuery?: string,
): Promise<ArticlesResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (hasStats) params.set("hasStats", "true");
  if (sourceQuery) params.set("sourceQuery", sourceQuery);

  const qs = params.toString();
  return apiFetch<ArticlesResponse>(
    `/api/projects/${projectId}/articles${qs ? `?${qs}` : ""}`,
  );
}

export async function apiUpdateArticleStatus(
  projectId: string,
  articleId: string,
  status: "candidate" | "selected" | "excluded" | "deleted",
  notes?: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/projects/${projectId}/articles/${articleId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    },
  );
}

export async function apiRemoveArticle(
  projectId: string,
  articleId: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/projects/${projectId}/articles/${articleId}`,
    {
      method: "DELETE",
    },
  );
}

export async function apiBulkUpdateStatus(
  projectId: string,
  articleIds: string[],
  status: "candidate" | "selected" | "excluded" | "deleted",
): Promise<{ ok: true; updated: number }> {
  return apiFetch<{ ok: true; updated: number }>(
    `/api/projects/${projectId}/articles/bulk-status`,
    {
      method: "POST",
      body: JSON.stringify({ articleIds, status }),
    },
  );
}

// Перевод статей
export type TranslateResult = {
  ok: true;
  translated: number;
  total: number;
  message: string;
};

export async function apiTranslateArticles(
  projectId: string,
  articleIds?: string[],
  untranslatedOnly = true,
): Promise<TranslateResult> {
  return apiFetch<TranslateResult>(
    `/api/projects/${projectId}/articles/translate`,
    {
      method: "POST",
      body: JSON.stringify({ articleIds, untranslatedOnly }),
    },
  );
}

// AI детекция статистики (SSE streaming)
export type AIStatsProgress = {
  batch: number;
  totalBatches: number;
  analyzed: number;
  found: number;
  errors: number;
  total: number;
  percent: number;
};

export type AIStatsResult = {
  ok: true;
  analyzed: number;
  found: number;
  errors: number;
  total: number;
  message: string;
};

export type AIStatsCallbacks = {
  onStart?: (data: { total: number; batchSize: number }) => void;
  onProgress?: (data: AIStatsProgress) => void;
  onComplete?: (data: AIStatsResult) => void;
  onError?: (error: Error) => void;
};

export async function apiDetectStatsWithAI(
  projectId: string,
  articleIds?: string[],
  callbacks?: AIStatsCallbacks,
): Promise<AIStatsResult> {
  const token = getToken();

  const response = await fetch(
    `/api/projects/${projectId}/articles/ai-detect-stats`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ articleIds }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type");

  // Если это SSE - обрабатываем стрим
  if (contentType?.includes("text/event-stream")) {
    return new Promise((resolve, reject) => {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result: AIStatsResult | null = null;

      const processLine = (line: string) => {
        if (line.startsWith("event: ")) {
          // Сохраняем тип события для следующей строки data
          buffer = line.slice(7);
        } else if (line.startsWith("data: ")) {
          const eventType = buffer;
          buffer = "";
          try {
            const data = JSON.parse(line.slice(6));

            if (eventType === "start" && callbacks?.onStart) {
              callbacks.onStart(data);
            } else if (eventType === "progress" && callbacks?.onProgress) {
              callbacks.onProgress(data);
            } else if (eventType === "complete") {
              result = data;
              callbacks?.onComplete?.(data);
            }
          } catch (e) {
            console.error("SSE parse error:", e);
          }
        }
      };

      const read = async () => {
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) {
              if (result) {
                resolve(result);
              } else {
                reject(new Error("Stream ended without complete event"));
              }
              break;
            }

            const text = decoder.decode(value, { stream: true });
            const lines = text.split("\n");
            for (const line of lines) {
              if (line.trim()) {
                processLine(line);
              }
            }
          }
        } catch (err) {
          callbacks?.onError?.(err as Error);
          reject(err);
        }
      };

      read();
    });
  }

  // Если обычный JSON ответ (для совместимости)
  const data = await response.json();
  callbacks?.onComplete?.(data);
  return data;
}

// Обогащение статей через Crossref
export type EnrichResult = {
  ok: true;
  enriched: number;
  total: number;
  message: string;
};

export async function apiEnrichArticles(
  projectId: string,
  articleIds?: string[],
): Promise<EnrichResult> {
  return apiFetch<EnrichResult>(`/api/projects/${projectId}/articles/enrich`, {
    method: "POST",
    body: JSON.stringify({ articleIds }),
  });
}

// ========== Documents ==========

export type Document = {
  id: string;
  project_id: string;
  title: string;
  content: string;
  order_index: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  citations?: Citation[];
};

export type Citation = {
  id: string;
  article_id: string;
  order_index: number;
  inline_number: number;
  sub_number?: number; // Номер цитаты внутри источника (1, 2, 3...)
  page_range: string | null;
  note: string | null; // Прямая цитата из текста статьи
  article: {
    id: string;
    title_en: string;
    title_ru: string | null;
    authors: string[] | null;
    year: number | null;
    journal: string | null;
    doi: string | null;
    pmid: string | null;
  };
};

export async function apiGetDocuments(
  projectId: string,
): Promise<{ documents: Document[] }> {
  return apiFetch<{ documents: Document[] }>(
    `/api/projects/${projectId}/documents`,
  );
}

export async function apiGetDocument(
  projectId: string,
  docId: string,
): Promise<{ document: Document }> {
  return apiFetch<{ document: Document }>(
    `/api/projects/${projectId}/documents/${docId}`,
  );
}

export async function apiCreateDocument(
  projectId: string,
  title: string,
  content?: string,
  parentId?: string,
): Promise<{ document: Document }> {
  return apiFetch<{ document: Document }>(
    `/api/projects/${projectId}/documents`,
    {
      method: "POST",
      body: JSON.stringify({ title, content, parentId }),
    },
  );
}

export async function apiUpdateDocument(
  projectId: string,
  docId: string,
  data: { title?: string; content?: string; orderIndex?: number },
): Promise<{ document: Document }> {
  return apiFetch<{ document: Document }>(
    `/api/projects/${projectId}/documents/${docId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function apiReorderDocuments(
  projectId: string,
  documentIds: string[],
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/projects/${projectId}/documents/reorder`,
    {
      method: "PUT",
      body: JSON.stringify({ documentIds }),
    },
  );
}

export async function apiRenumberCitations(
  projectId: string,
): Promise<{ ok: boolean; renumbered: number; documents: Document[] }> {
  return apiFetch<{ ok: boolean; renumbered: number; documents: Document[] }>(
    `/api/projects/${projectId}/renumber-citations`,
    {
      method: "POST",
    },
  );
}

export async function apiDeleteDocument(
  projectId: string,
  docId: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/projects/${projectId}/documents/${docId}`,
    { method: "DELETE" },
  );
}

export async function apiAddCitation(
  projectId: string,
  docId: string,
  articleId: string,
  pageRange?: string,
): Promise<{ citation: Citation }> {
  return apiFetch<{ citation: Citation }>(
    `/api/projects/${projectId}/documents/${docId}/citations`,
    {
      method: "POST",
      body: JSON.stringify({ articleId, pageRange }),
    },
  );
}

export async function apiRemoveCitation(
  projectId: string,
  docId: string,
  citationId: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/projects/${projectId}/documents/${docId}/citations/${citationId}`,
    { method: "DELETE" },
  );
}

export async function apiUpdateCitation(
  projectId: string,
  docId: string,
  citationId: string,
  data: { note?: string; pageRange?: string },
): Promise<{ citation: Citation }> {
  return apiFetch<{ citation: Citation }>(
    `/api/projects/${projectId}/documents/${docId}/citations/${citationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

// Синхронизирует цитаты документа с HTML контентом
// Удаляет из БД цитаты, которых больше нет в тексте
export async function apiSyncCitations(
  projectId: string,
  docId: string,
  citationIds: string[],
): Promise<{ ok: boolean; deleted: number; document: Document }> {
  return apiFetch<{ ok: boolean; deleted: number; document: Document }>(
    `/api/projects/${projectId}/documents/${docId}/sync-citations`,
    {
      method: "POST",
      body: JSON.stringify({ citationIds }),
    },
  );
}

// ========== Bibliography & Export ==========

export type BibliographyItem = {
  number: number;
  articleId: string;
  formatted: string;
  raw?: any;
};

export type BibliographyResponse = {
  citationStyle: CitationStyle;
  bibliography: BibliographyItem[];
};

export async function apiGetBibliography(
  projectId: string,
  style?: CitationStyle,
): Promise<BibliographyResponse> {
  const url = style
    ? `/api/projects/${projectId}/bibliography?style=${style}`
    : `/api/projects/${projectId}/bibliography`;
  return apiFetch<BibliographyResponse>(url);
}

export type ExportResponse = {
  projectName: string;
  citationStyle: CitationStyle;
  documents: Document[];
  bibliography: BibliographyItem[];
  mergedContent?: string; // Объединённый контент с общей нумерацией цитат
};

export async function apiExportProject(
  projectId: string,
): Promise<ExportResponse> {
  return apiFetch<ExportResponse>(`/api/projects/${projectId}/export`);
}

// ========== Citation Graph ==========

export type GraphNode = {
  id: string;
  label: string;
  title?: string; // Полное название статьи (EN)
  title_ru?: string; // Название на русском
  abstract?: string; // Аннотация (EN)
  abstract_ru?: string; // Аннотация на русском
  authors?: string; // Авторы
  journal?: string; // Журнал
  year: number | null;
  status: string;
  doi: string | null;
  pmid?: string | null;
  citedByCount?: number;
  graphLevel?: number; // 0 = citing, 1 = в проекте, 2 = references, 3 = related
  statsQuality?: number; // 0-3, качество статистики по p-value
  source?: string; // 'pubmed' | 'doaj' | 'wiley' | 'crossref'
};

export type GraphLink = {
  source: string;
  target: string;
};

export type LevelCounts = {
  level0?: number; // Цитирующие нас (citing)
  level1: number; // Статьи в проекте
  level2: number; // References
  level3?: number; // Связанные (также ссылаются на level2)
};

export type ClusterInfo = {
  id: string;
  label: string;
  nodeCount: number;
  pmids: string[];
  representativePmid: string;
  avgYear: number | null;
  avgCitations: number;
  clusterType: "year" | "journal";
};

export type CitationGraphResponse = {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    totalNodes: number;
    totalLinks: number;
    levelCounts?: LevelCounts;
    availableReferences?: number; // Количество PMIDs в reference_pmids
    availableCiting?: number; // Количество PMIDs в cited_by_pmids
  };
  availableQueries?: string[];
  yearRange?: {
    min: number | null;
    max: number | null;
  };
  currentDepth?: number;
  limits?: { maxLinksPerNode: number; maxExtraNodes: number };
  sortBy?: string;
  clusters?: ClusterInfo[];
  clusteringEnabled?: boolean;
};

export type GraphFilterOptions = {
  filter?: "all" | "selected" | "excluded";
  sourceQueries?: string[];
  depth?: 1 | 2 | 3; // Уровень глубины графа
  yearFrom?: number;
  yearTo?: number;
  statsQuality?: number; // Минимальное качество статистики (0-3)
  maxLinksPerNode?: number; // Макс связей на узел (по умолчанию 20, макс 100)
  maxTotalNodes?: number; // Макс узлов (по умолчанию 2000, макс 5000)
  sources?: ("pubmed" | "doaj" | "wiley")[]; // Фильтр по источнику статей
  sortBy?: "citations" | "frequency" | "year" | "default"; // Сортировка ссылок
  enableClustering?: boolean; // Включить кластеризацию для больших графов
  clusterBy?: "year" | "journal" | "auto"; // Метод кластеризации
};

export async function apiGetCitationGraph(
  projectId: string,
  options?: GraphFilterOptions,
): Promise<CitationGraphResponse> {
  const params = new URLSearchParams();
  if (options?.filter) {
    params.set("filter", options.filter);
  }
  if (options?.sourceQueries && options.sourceQueries.length > 0) {
    params.set("sourceQueries", JSON.stringify(options.sourceQueries));
  }
  if (options?.depth) {
    params.set("depth", String(options.depth));
  }
  if (options?.yearFrom !== undefined) {
    params.set("yearFrom", String(options.yearFrom));
  }
  if (options?.yearTo !== undefined) {
    params.set("yearTo", String(options.yearTo));
  }
  if (options?.statsQuality !== undefined) {
    params.set("statsQuality", String(options.statsQuality));
  }
  if (options?.maxLinksPerNode !== undefined) {
    params.set("maxLinksPerNode", String(options.maxLinksPerNode));
  }
  if (options?.maxTotalNodes !== undefined) {
    params.set("maxTotalNodes", String(options.maxTotalNodes));
  }
  if (options?.sources && options.sources.length > 0) {
    params.set("sources", JSON.stringify(options.sources));
  }
  // Новые параметры
  if (options?.sortBy) {
    params.set("sortBy", options.sortBy);
  }
  if (options?.enableClustering !== undefined) {
    params.set("enableClustering", String(options.enableClustering));
  }
  if (options?.clusterBy) {
    params.set("clusterBy", options.clusterBy);
  }
  const queryString = params.toString();
  const url = `/api/projects/${projectId}/citation-graph${queryString ? `?${queryString}` : ""}`;
  return apiFetch<CitationGraphResponse>(url);
}

export type ImportFromGraphPayload = {
  pmids?: string[];
  dois?: string[];
  status?: "candidate" | "selected";
};

export type ImportFromGraphResponse = {
  ok: boolean;
  added: number;
  skipped: number;
  message: string;
};

export async function apiImportFromGraph(
  projectId: string,
  payload: ImportFromGraphPayload,
): Promise<ImportFromGraphResponse> {
  return apiFetch<ImportFromGraphResponse>(
    `/api/projects/${projectId}/articles/import-from-graph`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

// Экспорт графа цитирований
export async function apiExportCitationGraph(
  projectId: string,
  format: "json" | "graphml" | "cytoscape" | "gexf" = "json",
): Promise<Blob> {
  const url = `/api/projects/${projectId}/citation-graph/export?format=${format}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  return response.blob();
}

// Рекомендации по улучшению графа
export type GraphRecommendation = {
  type: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  articleIds?: string[];
  action?: any;
};

export type GraphRecommendationsResponse = {
  recommendations: GraphRecommendation[];
  totalCount: number;
};

export async function apiGetGraphRecommendations(
  projectId: string,
): Promise<GraphRecommendationsResponse> {
  return apiFetch<GraphRecommendationsResponse>(
    `/api/projects/${projectId}/citation-graph/recommendations`,
  );
}

// === Semantic Search ===

export type SemanticSearchResult = {
  id: string;
  title: string;
  titleEn: string;
  abstract: string | null;
  year: number | null;
  authors: string[];
  journal: string | null;
  doi: string | null;
  pmid: string | null;
  status: string;
  similarity: number;
};

export type SemanticSearchResponse = {
  query: string;
  results: SemanticSearchResult[];
  totalFound: number;
  threshold: number;
};

export async function apiSemanticSearch(
  projectId: string,
  query: string,
  limit: number = 20,
  threshold: number = 0.7,
): Promise<SemanticSearchResponse> {
  return apiFetch<SemanticSearchResponse>(
    `/api/projects/${projectId}/citation-graph/semantic-search`,
    {
      method: "POST",
      body: JSON.stringify({ query, limit, threshold }),
    },
  );
}

export type GenerateEmbeddingsResponse = {
  success: boolean;
  total: number;
  processed: number;
  errors: number;
  remaining: number;
};

export async function apiGenerateEmbeddings(
  projectId: string,
  articleIds?: string[],
  batchSize: number = 50,
): Promise<GenerateEmbeddingsResponse> {
  return apiFetch<GenerateEmbeddingsResponse>(
    `/api/projects/${projectId}/citation-graph/generate-embeddings`,
    {
      method: "POST",
      body: JSON.stringify({ articleIds, batchSize }),
    },
  );
}

export type EmbeddingStatsResponse = {
  totalArticles: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  completionRate: number;
};

export async function apiGetEmbeddingStats(
  projectId: string,
): Promise<EmbeddingStatsResponse> {
  return apiFetch<EmbeddingStatsResponse>(
    `/api/projects/${projectId}/citation-graph/embedding-stats`,
  );
}

// === Methodology Clustering ===

export type MethodologyType =
  | "rct"
  | "meta_analysis"
  | "cohort"
  | "case_control"
  | "cross_sectional"
  | "case_report"
  | "review"
  | "experimental"
  | "qualitative"
  | "other";

export type MethodologyCluster = {
  type: MethodologyType;
  name: string;
  count: number;
  percentage: number;
  articleIds: string[];
  keywords: string[];
};

export type MethodologyAnalysisResponse = {
  success: boolean;
  totalArticles: number;
  clusters: MethodologyCluster[];
  summary: {
    top3: Array<{ type: MethodologyType; name: string; count: number }>;
    hasRCT: boolean;
    hasMetaAnalysis: boolean;
    experimentalRatio: number;
  };
};

export async function apiAnalyzeMethodologies(
  projectId: string,
): Promise<MethodologyAnalysisResponse> {
  return apiFetch<MethodologyAnalysisResponse>(
    `/api/projects/${projectId}/citation-graph/analyze-methodologies`,
    { method: "POST" },
  );
}

export type MethodologyStatsResponse = {
  total: number;
  rct: number;
  metaAnalysis: number;
  cohort: number;
  rctPercentage: number;
};

export async function apiGetMethodologyStats(
  projectId: string,
): Promise<MethodologyStatsResponse> {
  return apiFetch<MethodologyStatsResponse>(
    `/api/projects/${projectId}/citation-graph/methodology-stats`,
  );
}

// Получение связей между статьями из PubMed (фоновая загрузка)
export type FetchReferencesResult = {
  ok: true;
  jobId?: string;
  totalArticles?: number;
  totalProjectArticles?: number;
  articlesWithoutPmid?: number;
  estimatedSeconds?: number;
  message: string;
};

export type FetchReferencesStatusResult = {
  hasJob: boolean;
  jobId?: string;
  status?: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress?: number;
  totalArticles?: number;
  processedArticles?: number;
  totalPmidsToFetch?: number;
  fetchedPmids?: number;
  elapsedSeconds?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  // Новые поля для детального прогресса
  currentPhase?: string;
  phaseProgress?: string;
  lastProgressAt?: string;
  secondsSinceProgress?: number | null;
  isStalled?: boolean;
  stalledSeconds?: number;
  cancelReason?: "stalled" | "user_cancelled" | "timeout";
};

export type FetchReferencesOptions = {
  selectedOnly?: boolean; // Загружать связи только для отобранных статей
  articleIds?: string[]; // Загружать связи только для указанных статей
};

export async function apiFetchReferences(
  projectId: string,
  options?: FetchReferencesOptions,
): Promise<FetchReferencesResult> {
  return apiFetch<FetchReferencesResult>(
    `/api/projects/${projectId}/articles/fetch-references`,
    {
      method: "POST",
      body: options ? JSON.stringify(options) : undefined,
    },
  );
}

export async function apiFetchReferencesStatus(
  projectId: string,
): Promise<FetchReferencesStatusResult> {
  return apiFetch<FetchReferencesStatusResult>(
    `/api/projects/${projectId}/articles/fetch-references/status`,
  );
}

export async function apiCancelFetchReferences(
  projectId: string,
): Promise<{ ok: boolean; jobId?: string; message?: string; error?: string }> {
  return apiFetch<{
    ok: boolean;
    jobId?: string;
    message?: string;
    error?: string;
  }>(`/api/projects/${projectId}/articles/fetch-references/cancel`, {
    method: "POST",
  });
}

// ========== PDF Download ==========

export type PdfSourceResponse = {
  source: string;
  url: string;
  isPdf: boolean;
  directDownload: boolean;
};

export async function apiGetPdfSource(
  projectId: string,
  articleId: string,
): Promise<PdfSourceResponse> {
  return apiFetch<PdfSourceResponse>(
    `/api/projects/${projectId}/articles/${articleId}/pdf-source`,
  );
}

export function getPdfDownloadUrl(
  projectId: string,
  articleId: string,
): string {
  return `/api/projects/${projectId}/articles/${articleId}/pdf`;
}

// ========== Project Statistics (Charts & Tables) ==========

export type DataClassification = {
  variableType: "quantitative" | "qualitative";
  subType: "continuous" | "discrete" | "nominal" | "dichotomous" | "ordinal";
  isNormalDistribution?: boolean;
};

export type ProjectStatistic = {
  id: string;
  type: "chart" | "table";
  title: string;
  description?: string;
  config: Record<string, any>;
  table_data?: Record<string, any>;
  data_classification?: DataClassification;
  chart_type?: string;
  used_in_documents?: string[];
  order_index: number;
  created_at: string;
  updated_at: string;
  version?: number; // Optimistic locking
};

export async function apiGetStatistics(
  projectId: string,
): Promise<{ statistics: ProjectStatistic[] }> {
  return apiFetch<{ statistics: ProjectStatistic[] }>(
    `/api/projects/${projectId}/statistics`,
  );
}

export async function apiGetStatistic(
  projectId: string,
  statId: string,
): Promise<{ statistic: ProjectStatistic }> {
  return apiFetch<{ statistic: ProjectStatistic }>(
    `/api/projects/${projectId}/statistics/${statId}`,
  );
}

export async function apiCreateStatistic(
  projectId: string,
  data: {
    type: "chart" | "table";
    title: string;
    description?: string;
    config: Record<string, any>;
    tableData?: Record<string, any>;
    dataClassification?: DataClassification;
    chartType?: string;
  },
): Promise<{ statistic: ProjectStatistic }> {
  return apiFetch<{ statistic: ProjectStatistic }>(
    `/api/projects/${projectId}/statistics`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function apiUpdateStatistic(
  projectId: string,
  statId: string,
  data: {
    title?: string;
    description?: string;
    config?: Record<string, any>;
    tableData?: Record<string, any>;
    dataClassification?: DataClassification;
    chartType?: string;
    orderIndex?: number;
    version?: number; // Optimistic locking - отправлять для проверки конфликтов
  },
): Promise<{ statistic: ProjectStatistic }> {
  return apiFetch<{ statistic: ProjectStatistic }>(
    `/api/projects/${projectId}/statistics/${statId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function apiMarkStatisticUsedInDocument(
  projectId: string,
  statId: string,
  documentId: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/projects/${projectId}/statistics/${statId}/use`,
    {
      method: "POST",
      body: JSON.stringify({ documentId }),
    },
  );
}

export async function apiDeleteStatistic(
  projectId: string,
  statId: string,
  force = false,
): Promise<{ ok: true }> {
  const url = force
    ? `/api/projects/${projectId}/statistics/${statId}?force=true`
    : `/api/projects/${projectId}/statistics/${statId}`;
  return apiFetch<{ ok: true }>(url, { method: "DELETE" });
}

export async function apiMarkStatisticUsed(
  projectId: string,
  statId: string,
  documentId: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/projects/${projectId}/statistics/${statId}/use`,
    {
      method: "POST",
      body: JSON.stringify({ documentId }),
    },
  );
}

export async function apiUnmarkStatisticUsed(
  projectId: string,
  statId: string,
  documentId: string,
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/api/projects/${projectId}/statistics/${statId}/use`,
    {
      method: "DELETE",
      body: JSON.stringify({ documentId }),
    },
  );
}

export type SyncStatisticsData = {
  documentId: string;
  tables: Array<{
    id: string;
    title?: string;
    tableData: Record<string, any>;
  }>;
  charts: Array<{
    id: string;
    title?: string;
    config: Record<string, any>;
    tableData?: Record<string, any>;
  }>;
};

export async function apiSyncStatistics(
  projectId: string,
  data: SyncStatisticsData,
): Promise<{ ok: boolean; created: number; statistics: ProjectStatistic[] }> {
  return apiFetch<{
    ok: boolean;
    created: number;
    statistics: ProjectStatistic[];
  }>(`/api/projects/${projectId}/statistics/sync`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiCleanupStatistics(projectId: string): Promise<{
  ok: boolean;
  deleted: number;
  deletedItems: Array<{ id: string; title: string }>;
}> {
  return apiFetch<{
    ok: boolean;
    deleted: number;
    deletedItems: Array<{ id: string; title: string }>;
  }>(`/api/projects/${projectId}/statistics/cleanup`, { method: "POST" });
}

// =====================================================
// Получение данных статьи по PMID (для узлов графа без полных данных)
// =====================================================
export type ArticleByPmidResult = {
  ok: boolean;
  source: "database" | "pubmed";
  article: {
    pmid: string | null;
    doi: string | null;
    title: string | null;
    title_ru: string | null;
    abstract: string | null;
    abstract_ru: string | null;
    authors: string | null;
    journal: string | null;
    year: number | null;
    citedByCount: number;
  };
};

export async function apiGetArticleByPmid(
  pmid: string,
): Promise<ArticleByPmidResult> {
  return apiFetch<ArticleByPmidResult>(`/api/articles/by-pmid/${pmid}`);
}

// =====================================================
// Перевод текста на лету (для графа)
// =====================================================
export type TranslateTextResult = {
  ok: boolean;
  title_ru?: string | null;
  abstract_ru?: string | null;
  error?: string;
};

export async function apiTranslateText(
  title?: string,
  abstract?: string,
  pmid?: string,
): Promise<TranslateTextResult> {
  return apiFetch<TranslateTextResult>("/api/articles/translate-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, abstract, pmid }),
  });
}

// ========== Project Files ==========

export type FileCategory = "document" | "image" | "video" | "audio" | "other";

export type ProjectFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sizeFormatted: string;
  category: FileCategory;
  description: string | null;
  usedInDocuments: string[];
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FilesResponse = {
  files: ProjectFile[];
  storageConfigured: boolean;
};

export type StorageStatusResponse = {
  configured: boolean;
  maxFileSize: number;
  maxFileSizeFormatted: string;
  allowedTypes: string[];
};

export async function apiGetStorageStatus(): Promise<StorageStatusResponse> {
  return apiFetch<StorageStatusResponse>("/api/storage/status");
}

export async function apiGetProjectFiles(
  projectId: string,
  category?: FileCategory,
): Promise<FilesResponse> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const qs = params.toString();
  return apiFetch<FilesResponse>(
    `/api/projects/${projectId}/files${qs ? `?${qs}` : ""}`,
  );
}

export async function apiUploadFile(
  projectId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ file: ProjectFile }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(
            new Error(error.message || error.error || `HTTP ${xhr.status}`),
          );
        } catch {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("POST", `/api/projects/${projectId}/files`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  });
}

export async function apiGetFileDownloadUrl(
  projectId: string,
  fileId: string,
): Promise<{ url: string; expiresIn: number }> {
  return apiFetch<{ url: string; expiresIn: number }>(
    `/api/projects/${projectId}/files/${fileId}/url`,
  );
}

export function getFileDownloadPath(projectId: string, fileId: string): string {
  return `/api/projects/${projectId}/files/${fileId}/download?redirect=true`;
}

export async function apiUpdateFile(
  projectId: string,
  fileId: string,
  data: { name?: string; description?: string },
): Promise<{ file: Partial<ProjectFile> }> {
  return apiFetch<{ file: Partial<ProjectFile> }>(
    `/api/projects/${projectId}/files/${fileId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function apiDeleteFile(
  projectId: string,
  fileId: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/projects/${projectId}/files/${fileId}`, {
    method: "DELETE",
  });
}

export async function apiMarkFileUsed(
  projectId: string,
  fileId: string,
  documentId: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/projects/${projectId}/files/${fileId}/use`,
    {
      method: "POST",
      body: JSON.stringify({ documentId }),
    },
  );
}

export async function apiUnmarkFileUsed(
  projectId: string,
  fileId: string,
  documentId: string,
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/projects/${projectId}/files/${fileId}/use`,
    {
      method: "DELETE",
      body: JSON.stringify({ documentId }),
    },
  );
}

export async function apiSyncFileUsage(
  projectId: string,
  documentId: string,
  fileIds: string[],
): Promise<{ ok: true; synced: number }> {
  return apiFetch<{ ok: true; synced: number }>(
    `/api/projects/${projectId}/files/sync`,
    {
      method: "POST",
      body: JSON.stringify({ documentId, fileIds }),
    },
  );
}

// ========== File Article Import ==========

export type ExtractedReference = {
  text: string;
  title: string | null;
  authors: string | null;
  year: number | null;
  doi: string | null;
  journal: string | null;
};

export type ExtractedArticleMetadata = {
  title: string | null;
  authors: string[] | null;
  year: number | null;
  doi: string | null;
  url: string | null;
  journal: string | null;
  abstract: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  bibliography: ExtractedReference[] | null;
};

export type FileAnalysisResponse = {
  ok: boolean;
  fileId: string;
  fileName: string;
  metadata: ExtractedArticleMetadata;
  textPreview: string;
  fullText?: string;
  cached?: boolean;
  cachedAt?: string;
};

export async function apiAnalyzeFile(
  projectId: string,
  fileId: string,
  force: boolean = false,
): Promise<FileAnalysisResponse> {
  const url = force
    ? `/api/projects/${projectId}/files/${fileId}/analyze?force=true`
    : `/api/projects/${projectId}/files/${fileId}/analyze`;
  return apiFetch<FileAnalysisResponse>(url, { method: "POST" });
}

export type ImportFileAsArticleResponse = {
  ok: boolean;
  articleId: string;
  message: string;
  isExisting: boolean;
};

export async function apiImportFileAsArticle(
  projectId: string,
  fileId: string,
  metadata: ExtractedArticleMetadata,
  status: "selected" | "candidate" = "selected",
): Promise<ImportFileAsArticleResponse> {
  return apiFetch<ImportFileAsArticleResponse>(
    `/api/projects/${projectId}/files/${fileId}/import-as-article`,
    {
      method: "POST",
      body: JSON.stringify({ metadata, status }),
    },
  );
}

export type ImportFileAsDocumentResponse = {
  ok: boolean;
  documentId: string;
  documentName: string;
  message: string;
};

export async function apiImportFileAsDocument(
  projectId: string,
  fileId: string,
  metadata: ExtractedArticleMetadata,
  includeFullText: boolean = true,
): Promise<ImportFileAsDocumentResponse> {
  return apiFetch<ImportFileAsDocumentResponse>(
    `/api/projects/${projectId}/files/${fileId}/import-as-document`,
    {
      method: "POST",
      body: JSON.stringify({ metadata, includeFullText }),
    },
  );
}

// ========== Convert Article to Document ==========

export type ConvertArticleToDocumentResponse = {
  ok: boolean;
  documentId: string;
  documentTitle: string;
  bibliographyAdded: number;
  message: string;
};

export async function apiConvertArticleToDocument(
  projectId: string,
  articleId: string,
  options: {
    includeBibliography?: boolean;
    documentTitle?: string;
  } = {},
): Promise<ConvertArticleToDocumentResponse> {
  return apiFetch<ConvertArticleToDocumentResponse>(
    `/api/projects/${projectId}/articles/${articleId}/convert-to-document`,
    {
      method: "POST",
      body: JSON.stringify(options),
    },
  );
}

// ========== Graph AI Assistant ==========

export type SearchSuggestion = {
  query: string;
  description: string;
  filters?: {
    yearFrom?: number;
    yearTo?: number;
    sources?: string[];
  };
};

// Статья из графа для передачи в AI
export type GraphArticleForAI = {
  id: string;
  title?: string;
  abstract?: string;
  year?: number | null;
  journal?: string;
  authors?: string;
  pmid?: string | null;
  doi?: string | null;
  citedByCount?: number;
  graphLevel?: number;
  source?: string; // 'pubmed' | 'doaj' | 'wiley' | 'crossref'
  status?: string; // статус статьи в проекте
};

// Найденная статья с причиной
export type FoundArticle = {
  id: string;
  title?: string;
  year?: number | null;
  journal?: string;
  pmid?: string | null;
  doi?: string | null;
  citedByCount?: number;
  reason: string;
};

export type GraphAIAssistantResponse = {
  ok: boolean;
  response: string;
  foundArticleIds: string[]; // ID найденных статей для подсветки
  foundArticles: FoundArticle[]; // Полная информация о найденных статьях
  searchSuggestions: SearchSuggestion[]; // Deprecated, но оставляем для совместимости
  pmidsToAdd: string[]; // Deprecated
  doisToAdd: string[]; // Deprecated
  error?: string;
};

// Активные фильтры графа для AI
export type GraphFiltersForAI = {
  filter?: "all" | "selected" | "excluded"; // Фильтр статуса
  depth?: number; // Глубина графа (1-3)
  sources?: string[]; // Фильтр по источникам (pubmed, doaj, wiley)
  yearFrom?: number; // Минимальный год
  yearTo?: number; // Максимальный год
  statsQuality?: number; // Минимальное качество p-value (0-3)
};

export async function apiGraphAIAssistant(
  projectId: string,
  message: string,
  graphArticles?: GraphArticleForAI[],
  context?: {
    articleCount?: number;
    yearRange?: { min: number | null; max: number | null };
  },
  filters?: GraphFiltersForAI,
): Promise<GraphAIAssistantResponse> {
  return apiFetch<GraphAIAssistantResponse>(
    `/api/projects/${projectId}/graph-ai-assistant`,
    {
      method: "POST",
      body: JSON.stringify({ message, graphArticles, context, filters }),
    },
  );
}

// ========== Document Versioning ==========

export type DocumentVersion = {
  id: string;
  document_id: string;
  version_number: number;
  version_type: "auto" | "manual" | "exit";
  version_note?: string;
  content_length: number;
  created_at: string;
  created_by_email?: string;
  content?: string;
  title?: string;
};

export type DocumentVersionsResponse = {
  versions: DocumentVersion[];
  tableNotReady?: boolean;
};

export async function apiGetDocumentVersions(
  projectId: string,
  docId: string,
): Promise<DocumentVersionsResponse> {
  return apiFetch<DocumentVersionsResponse>(
    `/api/projects/${projectId}/documents/${docId}/versions`,
  );
}

export async function apiGetDocumentVersion(
  projectId: string,
  docId: string,
  versionId: string,
): Promise<{ version: DocumentVersion }> {
  return apiFetch<{ version: DocumentVersion }>(
    `/api/projects/${projectId}/documents/${docId}/versions/${versionId}`,
  );
}

export async function apiCreateDocumentVersion(
  projectId: string,
  docId: string,
  versionNote?: string,
  versionType: "manual" | "auto" | "exit" = "manual",
): Promise<{ version: DocumentVersion }> {
  return apiFetch<{ version: DocumentVersion }>(
    `/api/projects/${projectId}/documents/${docId}/versions`,
    {
      method: "POST",
      body: JSON.stringify({ versionNote, versionType }),
    },
  );
}

export async function apiRestoreDocumentVersion(
  projectId: string,
  docId: string,
  versionId: string,
): Promise<{
  success: boolean;
  restoredContent: string;
  restoredTitle: string;
}> {
  return apiFetch<{
    success: boolean;
    restoredContent: string;
    restoredTitle: string;
  }>(
    `/api/projects/${projectId}/documents/${docId}/versions/${versionId}/restore`,
    { method: "POST" },
  );
}

export async function apiTriggerAutoVersion(
  projectId: string,
  docId: string,
  content: string,
): Promise<{
  created: boolean;
  version?: DocumentVersion;
  reason?: string;
  tableNotReady?: boolean;
}> {
  return apiFetch<{
    created: boolean;
    version?: DocumentVersion;
    reason?: string;
    tableNotReady?: boolean;
  }>(`/api/projects/${projectId}/documents/${docId}/auto-version`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
