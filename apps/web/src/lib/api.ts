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

export type Project = {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "editor" | "viewer";
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
  data: { name?: string; description?: string }
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
