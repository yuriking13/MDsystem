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
    const payload = (await readJsonSafe(res)) as ApiErrorPayload | string | null;
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

export async function apiRegister(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
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

export async function apiSaveApiKey(provider: string, key: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/api/user/api-keys", {
    method: "POST",
    body: JSON.stringify({ provider, key }),
  });
}

export async function apiDeleteApiKey(provider: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/user/api-keys/${encodeURIComponent(provider)}`, {
    method: "DELETE",
  });
}

// ========== Projects ==========

export type CitationStyle = "gost" | "apa" | "vancouver";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "editor" | "viewer";
  citation_style?: CitationStyle;
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
  description?: string
): Promise<{ project: Project }> {
  return apiFetch<{ project: Project }>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function apiUpdateProject(
  id: string,
  data: { name?: string; description?: string; citationStyle?: CitationStyle }
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
  projectId: string
): Promise<{ members: ProjectMember[] }> {
  return apiFetch<{ members: ProjectMember[] }>(`/api/projects/${projectId}/members`);
}

export async function apiInviteProjectMember(
  projectId: string,
  email: string,
  role: "viewer" | "editor" = "viewer"
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function apiRemoveProjectMember(
  projectId: string,
  userId: string
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
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
  status: "candidate" | "selected" | "excluded";
  notes: string | null;
  tags: string[] | null;
  added_at: string;
};

export type ArticlesResponse = {
  articles: Article[];
  counts: { candidate: number; selected: number; excluded: number };
  total: number;
};

export type SearchFilters = {
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
  message: string;
};

export async function apiSearchArticles(
  projectId: string,
  query: string,
  filters?: SearchFilters,
  maxResults = 100
): Promise<SearchResult> {
  return apiFetch<SearchResult>(`/api/projects/${projectId}/search`, {
    method: "POST",
    body: JSON.stringify({ query, filters, maxResults }),
  });
}

export async function apiGetArticles(
  projectId: string,
  status?: "candidate" | "selected" | "excluded",
  hasStats?: boolean
): Promise<ArticlesResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (hasStats) params.set("hasStats", "true");
  
  const qs = params.toString();
  return apiFetch<ArticlesResponse>(
    `/api/projects/${projectId}/articles${qs ? `?${qs}` : ""}`
  );
}

export async function apiUpdateArticleStatus(
  projectId: string,
  articleId: string,
  status: "candidate" | "selected" | "excluded",
  notes?: string
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/projects/${projectId}/articles/${articleId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
}

export async function apiRemoveArticle(
  projectId: string,
  articleId: string
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/api/projects/${projectId}/articles/${articleId}`, {
    method: "DELETE",
  });
}

export async function apiBulkUpdateStatus(
  projectId: string,
  articleIds: string[],
  status: "candidate" | "selected" | "excluded"
): Promise<{ ok: true; updated: number }> {
  return apiFetch<{ ok: true; updated: number }>(
    `/api/projects/${projectId}/articles/bulk-status`,
    {
      method: "POST",
      body: JSON.stringify({ articleIds, status }),
    }
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
  untranslatedOnly = true
): Promise<TranslateResult> {
  return apiFetch<TranslateResult>(
    `/api/projects/${projectId}/articles/translate`,
    {
      method: "POST",
      body: JSON.stringify({ articleIds, untranslatedOnly }),
    }
  );
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
  articleIds?: string[]
): Promise<EnrichResult> {
  return apiFetch<EnrichResult>(
    `/api/projects/${projectId}/articles/enrich`,
    {
      method: "POST",
      body: JSON.stringify({ articleIds }),
    }
  );
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
  projectId: string
): Promise<{ documents: Document[] }> {
  return apiFetch<{ documents: Document[] }>(
    `/api/projects/${projectId}/documents`
  );
}

export async function apiGetDocument(
  projectId: string,
  docId: string
): Promise<{ document: Document }> {
  return apiFetch<{ document: Document }>(
    `/api/projects/${projectId}/documents/${docId}`
  );
}

export async function apiCreateDocument(
  projectId: string,
  title: string,
  content?: string,
  parentId?: string
): Promise<{ document: Document }> {
  return apiFetch<{ document: Document }>(
    `/api/projects/${projectId}/documents`,
    {
      method: "POST",
      body: JSON.stringify({ title, content, parentId }),
    }
  );
}

export async function apiUpdateDocument(
  projectId: string,
  docId: string,
  data: { title?: string; content?: string; orderIndex?: number }
): Promise<{ document: Document }> {
  return apiFetch<{ document: Document }>(
    `/api/projects/${projectId}/documents/${docId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function apiDeleteDocument(
  projectId: string,
  docId: string
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/projects/${projectId}/documents/${docId}`,
    { method: "DELETE" }
  );
}

export async function apiAddCitation(
  projectId: string,
  docId: string,
  articleId: string,
  pageRange?: string
): Promise<{ citation: Citation }> {
  return apiFetch<{ citation: Citation }>(
    `/api/projects/${projectId}/documents/${docId}/citations`,
    {
      method: "POST",
      body: JSON.stringify({ articleId, pageRange }),
    }
  );
}

export async function apiRemoveCitation(
  projectId: string,
  docId: string,
  citationId: string
): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(
    `/api/projects/${projectId}/documents/${docId}/citations/${citationId}`,
    { method: "DELETE" }
  );
}

export async function apiUpdateCitation(
  projectId: string,
  docId: string,
  citationId: string,
  data: { note?: string; pageRange?: string }
): Promise<{ citation: Citation }> {
  return apiFetch<{ citation: Citation }>(
    `/api/projects/${projectId}/documents/${docId}/citations/${citationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
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
  style?: CitationStyle
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
};

export async function apiExportProject(projectId: string): Promise<ExportResponse> {
  return apiFetch<ExportResponse>(`/api/projects/${projectId}/export`);
}

// ========== Citation Graph ==========

export type GraphNode = {
  id: string;
  label: string;
  year: number | null;
  status: string;
  doi: string | null;
};

export type GraphLink = {
  source: string;
  target: string;
};

export type CitationGraphResponse = {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    totalNodes: number;
    totalLinks: number;
  };
};

export async function apiGetCitationGraph(projectId: string): Promise<CitationGraphResponse> {
  return apiFetch<CitationGraphResponse>(`/api/projects/${projectId}/citation-graph`);
}

// Получение связей между статьями из PubMed
export type FetchReferencesResult = {
  ok: true;
  updated: number;
  total: number;
  message: string;
};

export async function apiFetchReferences(projectId: string): Promise<FetchReferencesResult> {
  return apiFetch<FetchReferencesResult>(
    `/api/projects/${projectId}/articles/fetch-references`,
    { method: "POST" }
  );
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
  articleId: string
): Promise<PdfSourceResponse> {
  return apiFetch<PdfSourceResponse>(
    `/api/projects/${projectId}/articles/${articleId}/pdf-source`
  );
}

export function getPdfDownloadUrl(projectId: string, articleId: string): string {
  return `/api/projects/${projectId}/articles/${articleId}/pdf`;
}
