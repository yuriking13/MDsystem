import { getAdminToken } from "./adminToken";

// Admin API fetch function that uses admin token
async function adminApiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }

  const auth = init.auth ?? true;
  if (auth) {
    const token = getAdminToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const msg = payload?.message || payload?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

// ========== Admin Types ==========

export type AdminUser = {
  id: string;
  email: string;
  isAdmin: boolean;
};

export type AdminAuthResponse = {
  user: AdminUser;
  token: string;
};

export type AdminStats = {
  totalUsers: number;
  totalProjects: number;
  totalArticles: number;
  totalDocuments: number;
  activeUsersToday: number;
  unresolvedErrorsToday: number;
};

export type UserListItem = {
  id: string;
  email: string;
  created_at: string;
  last_login_at: string | null;
  is_admin: boolean;
  projects_count: number;
  member_of_count: number;
  subscription_status: string;
};

export type UsersListResponse = {
  users: UserListItem[];
  total: number;
  page: number;
  totalPages: number;
};

export type UserSession = {
  id: string;
  started_at: string;
  ended_at: string | null;
  last_activity_at: string;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
};

export type UserActivitySummary = {
  action_type: string;
  count: string;
  date: string;
  total_duration: string;
};

export type UserProject = {
  id: string;
  name: string;
  created_at: string;
  documents_count: string;
  articles_count: string;
};

export type UserDetailResponse = {
  user: UserListItem & {
    subscription_status: string;
    subscription_expires: string | null;
    is_blocked?: boolean;
  };
  projects: UserProject[];
  recentActivity: UserActivitySummary[];
  sessions: UserSession[];
};

export type ActivityItem = {
  id: string;
  user_id: string;
  email: string;
  session_id: string;
  action_type: string;
  action_detail: unknown;
  ip_address: string;
  user_agent: string;
  created_at: string;
  duration_seconds: number;
};

export type ActivityListResponse = {
  activity: ActivityItem[];
  total: number;
  page: number;
  totalPages: number;
};

export type CalendarDay = {
  date: string;
  unique_users: string;
  total_actions: string;
  total_minutes: string;
  action_types: string[];
};

export type CalendarResponse = {
  days: CalendarDay[];
};

export type DailyUserActivity = {
  user_id: string;
  email: string;
  actions_count: string;
  total_minutes: string;
  first_activity: string;
  last_activity: string;
  action_types: string[];
};

export type DailyActivityResponse = {
  users: DailyUserActivity[];
};

export type ErrorLogItem = {
  id: string;
  error_type: string;
  error_message: string;
  error_stack: string | null;
  user_id: string | null;
  user_email: string | null;
  request_path: string | null;
  request_method: string | null;
  request_body: unknown;
  ip_address: string;
  created_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by_email: string | null;
  notes: string | null;
};

export type ErrorsListResponse = {
  errors: ErrorLogItem[];
  total: number;
  page: number;
  totalPages: number;
  errorTypes: string[];
};

export type AuditLogItem = {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: unknown;
  ip_address: string;
  created_at: string;
};

export type AuditListResponse = {
  logs: AuditLogItem[];
  total: number;
  page: number;
  totalPages: number;
};

export type SystemOverview = {
  storage: {
    byCategory: {
      total_files: string;
      total_size_bytes: string;
      category: string;
      category_count: string;
    }[];
  };
  recentProjects: {
    id: string;
    name: string;
    created_at: string;
    owner_email: string;
    docs_count: string;
  }[];
  activeJobs: {
    status: string;
    count: string;
  }[];
};

// ========== Admin API Functions ==========

export async function apiAdminLogin(
  email: string,
  password: string,
  adminToken?: string,
): Promise<AdminAuthResponse> {
  return adminApiFetch<AdminAuthResponse>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password, adminToken }),
    auth: false,
  });
}

export async function apiAdminMe(): Promise<{ user: AdminUser }> {
  return adminApiFetch<{ user: AdminUser }>("/api/admin/me");
}

export async function apiAdminGenerateToken(): Promise<{
  token: string;
  message: string;
}> {
  return adminApiFetch<{ token: string; message: string }>(
    "/api/admin/generate-token",
    {
      method: "POST",
    },
  );
}

export async function apiAdminStats(): Promise<AdminStats> {
  return adminApiFetch<AdminStats>("/api/admin/stats");
}

// Users
export async function apiAdminGetUsers(
  page = 1,
  limit = 20,
  search?: string,
): Promise<UsersListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.append("search", search);
  return adminApiFetch<UsersListResponse>(`/api/admin/users?${params}`);
}

export async function apiAdminGetUser(
  userId: string,
): Promise<UserDetailResponse> {
  return adminApiFetch<UserDetailResponse>(`/api/admin/users/${userId}`);
}

export async function apiAdminUpdateUserAdmin(
  userId: string,
  isAdmin: boolean,
): Promise<{ ok: true }> {
  return adminApiFetch<{ ok: true }>(`/api/admin/users/${userId}/admin`, {
    method: "PATCH",
    body: JSON.stringify({ isAdmin }),
  });
}

// Activity
export async function apiAdminGetActivity(params: {
  userId?: string;
  startDate?: string;
  endDate?: string;
  actionType?: string;
  page?: number;
  limit?: number;
}): Promise<ActivityListResponse> {
  const urlParams = new URLSearchParams();
  if (params.userId) urlParams.append("userId", params.userId);
  if (params.startDate) urlParams.append("startDate", params.startDate);
  if (params.endDate) urlParams.append("endDate", params.endDate);
  if (params.actionType) urlParams.append("actionType", params.actionType);
  if (params.page) urlParams.append("page", String(params.page));
  if (params.limit) urlParams.append("limit", String(params.limit));
  return adminApiFetch<ActivityListResponse>(
    `/api/admin/activity?${urlParams}`,
  );
}

export async function apiAdminGetCalendar(
  year: number,
  month: number,
  userId?: string,
): Promise<CalendarResponse> {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  if (userId) params.append("userId", userId);
  return adminApiFetch<CalendarResponse>(
    `/api/admin/activity/calendar?${params}`,
  );
}

export async function apiAdminGetDailyActivity(
  date: string,
  userId?: string,
): Promise<DailyActivityResponse> {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  return adminApiFetch<DailyActivityResponse>(
    `/api/admin/activity/daily/${date}?${params}`,
  );
}

// Errors
export async function apiAdminGetErrors(params: {
  resolved?: "true" | "false" | "all";
  errorType?: string;
  page?: number;
  limit?: number;
}): Promise<ErrorsListResponse> {
  const urlParams = new URLSearchParams();
  if (params.resolved) urlParams.append("resolved", params.resolved);
  if (params.errorType) urlParams.append("errorType", params.errorType);
  if (params.page) urlParams.append("page", String(params.page));
  if (params.limit) urlParams.append("limit", String(params.limit));
  return adminApiFetch<ErrorsListResponse>(`/api/admin/errors?${urlParams}`);
}

export async function apiAdminResolveError(
  errorId: string,
  notes?: string,
): Promise<{ ok: true }> {
  return adminApiFetch<{ ok: true }>(`/api/admin/errors/${errorId}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  });
}

// Audit
export async function apiAdminGetAudit(params: {
  adminId?: string;
  action?: string;
  page?: number;
  limit?: number;
}): Promise<AuditListResponse> {
  const urlParams = new URLSearchParams();
  if (params.adminId) urlParams.append("adminId", params.adminId);
  if (params.action) urlParams.append("action", params.action);
  if (params.page) urlParams.append("page", String(params.page));
  if (params.limit) urlParams.append("limit", String(params.limit));
  return adminApiFetch<AuditListResponse>(`/api/admin/audit?${urlParams}`);
}

// System
export async function apiAdminSystemOverview(): Promise<SystemOverview> {
  return adminApiFetch<SystemOverview>("/api/admin/system/overview");
}
// Extended Types
export type ExtendedStats = {
  usersGrowth: { date: string; count: string }[];
  projectsGrowth: { date: string; count: string }[];
  activeUsersWeekly: { date: string; count: string }[];
  topUsers: {
    id: string;
    email: string;
    projects_count: string;
    documents_count: string;
    articles_count: string;
  }[];
  errorsByType: { error_type: string; count: string }[];
  activityByType: {
    action_type: string;
    count: string;
    total_minutes: string;
  }[];
};

export type RealtimeStats = {
  onlineUsers: number;
  recentActivity: { action_type: string; count: string }[];
  recentErrors: { error_type: string; count: string }[];
};

export type ActiveSession = {
  id: string;
  user_id: string;
  email: string;
  started_at: string;
  last_activity_at: string;
  ip_address: string;
  user_agent: string;
};

export type UserProjectsResponse = {
  projects: {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    documents_count: string;
    articles_count: string;
    files_count: string;
    total_size: string;
  }[];
  total: number;
  page: number;
  totalPages: number;
};

// Extended Stats
export async function apiAdminExtendedStats(): Promise<ExtendedStats> {
  return adminApiFetch<ExtendedStats>("/api/admin/stats/extended");
}

export async function apiAdminRealtimeStats(): Promise<RealtimeStats> {
  return adminApiFetch<RealtimeStats>("/api/admin/stats/realtime");
}

// User Management Extended
export async function apiAdminBlockUser(
  userId: string,
  blocked: boolean,
  reason?: string,
): Promise<{ ok: true }> {
  return adminApiFetch<{ ok: true }>(`/api/admin/users/${userId}/block`, {
    method: "PATCH",
    body: JSON.stringify({ blocked, reason }),
  });
}

export async function apiAdminDeleteUser(
  userId: string,
): Promise<{ ok: true }> {
  return adminApiFetch<{ ok: true }>(`/api/admin/users/${userId}`, {
    method: "DELETE",
    body: JSON.stringify({ confirm: true }),
  });
}

export async function apiAdminResetPassword(
  userId: string,
): Promise<{ resetLink: string; expiresAt: string; message: string }> {
  return adminApiFetch<{
    resetLink: string;
    expiresAt: string;
    message: string;
  }>(`/api/admin/users/${userId}/reset-password`, { method: "POST" });
}

export async function apiAdminGetUserProjects(
  userId: string,
  page = 1,
  limit = 20,
): Promise<UserProjectsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return adminApiFetch<UserProjectsResponse>(
    `/api/admin/users/${userId}/projects?${params}`,
  );
}

// Export
export function getExportUsersUrl(): string {
  return "/api/admin/export/users";
}

export function getExportActivityUrl(
  startDate?: string,
  endDate?: string,
): string {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  return `/api/admin/export/activity?${params}`;
}

export function getExportErrorsUrl(): string {
  return "/api/admin/export/errors";
}

// Bulk Operations
export async function apiAdminBulkResolveErrors(
  errorIds: string[],
  notes?: string,
): Promise<{ ok: true; resolvedCount: number }> {
  return adminApiFetch<{ ok: true; resolvedCount: number }>(
    "/api/admin/errors/bulk-resolve",
    {
      method: "POST",
      body: JSON.stringify({ errorIds, notes }),
    },
  );
}

// Sessions
export async function apiAdminGetActiveSessions(): Promise<{
  sessions: ActiveSession[];
}> {
  return adminApiFetch<{ sessions: ActiveSession[] }>(
    "/api/admin/sessions/active",
  );
}

export async function apiAdminTerminateSession(
  sessionId: string,
): Promise<{ ok: true }> {
  return adminApiFetch<{ ok: true }>(
    `/api/admin/sessions/${sessionId}/terminate`,
    {
      method: "POST",
    },
  );
}

// Client Error Logging (public endpoint)
export async function logClientError(error: {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  url?: string;
  userAgent?: string;
  componentStack?: string;
}): Promise<void> {
  try {
    await fetch("/api/errors/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(error),
    });
  } catch {
    // Silently fail - don't cause more errors when logging errors
  }
}

// ========== Projects Management ==========

export type AdminProject = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  citation_style: string;
  research_type: string | null;
  language: string | null;
  owner_id: string | null;
  owner_email: string | null;
  documents_count: number;
  articles_count: number;
  files_count: number;
  members_count: number;
  total_size: number;
};

export type AdminProjectsResponse = {
  projects: AdminProject[];
  total: number;
  page: number;
  totalPages: number;
};

export type AdminProjectDetail = {
  project: AdminProject & {
    created_by: string | null;
    ai_error_analysis_enabled: boolean;
    ai_protocol_check_enabled: boolean;
  };
  members: {
    user_id: string;
    email: string;
    role: string;
    joined_at: string;
  }[];
  recentActivity: ActivityItem[];
  statisticsSummary: { type: string; count: number }[];
};

export async function apiAdminGetProjects(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?:
    | "created_at"
    | "updated_at"
    | "name"
    | "documents_count"
    | "articles_count";
  sortOrder?: "asc" | "desc";
}): Promise<AdminProjectsResponse> {
  const urlParams = new URLSearchParams();
  if (params.page) urlParams.append("page", String(params.page));
  if (params.limit) urlParams.append("limit", String(params.limit));
  if (params.search) urlParams.append("search", params.search);
  if (params.sortBy) urlParams.append("sortBy", params.sortBy);
  if (params.sortOrder) urlParams.append("sortOrder", params.sortOrder);
  return adminApiFetch<AdminProjectsResponse>(
    `/api/admin/projects?${urlParams}`,
  );
}

export async function apiAdminGetProject(
  projectId: string,
): Promise<AdminProjectDetail> {
  return adminApiFetch<AdminProjectDetail>(`/api/admin/projects/${projectId}`);
}

export async function apiAdminDeleteProject(
  projectId: string,
): Promise<{ ok: true }> {
  return adminApiFetch<{ ok: true }>(`/api/admin/projects/${projectId}`, {
    method: "DELETE",
    body: JSON.stringify({ confirm: true }),
  });
}

// ========== Jobs Management ==========

export type AdminJob = {
  id: string;
  project_id: string;
  project_name: string | null;
  owner_email: string | null;
  status: string;
  total_articles: number;
  processed_articles: number;
  total_pmids_to_fetch: number;
  fetched_pmids: number;
  started_at: string | null;
  completed_at: string | null;
  last_progress_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  error_message: string | null;
  created_at: string;
};

export type AdminJobsResponse = {
  jobs: AdminJob[];
  total: number;
  page: number;
  totalPages: number;
  summary: { status: string; count: number }[];
};

export async function apiAdminGetJobs(params: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminJobsResponse> {
  const urlParams = new URLSearchParams();
  if (params.status) urlParams.append("status", params.status);
  if (params.page) urlParams.append("page", String(params.page));
  if (params.limit) urlParams.append("limit", String(params.limit));
  return adminApiFetch<AdminJobsResponse>(`/api/admin/jobs?${urlParams}`);
}

export async function apiAdminCancelJob(jobId: string): Promise<{ ok: true }> {
  return adminApiFetch<{ ok: true }>(`/api/admin/jobs/${jobId}/cancel`, {
    method: "POST",
  });
}

export async function apiAdminRetryJob(jobId: string): Promise<{ ok: true }> {
  return adminApiFetch<{ ok: true }>(`/api/admin/jobs/${jobId}/retry`, {
    method: "POST",
  });
}

// ========== Articles Management ==========

export type AdminArticle = {
  id: string;
  doi: string | null;
  pmid: string | null;
  title_en: string;
  year: number | null;
  journal: string | null;
  source: string;
  has_stats: boolean;
  created_at: string;
  projects_using: number;
};

export type AdminArticlesResponse = {
  articles: AdminArticle[];
  total: number;
  page: number;
  totalPages: number;
  sources: { source: string; count: number }[];
  stats: {
    total: number;
    with_stats: number;
    with_doi: number;
    with_pmid: number;
    from_files: number;
  };
};

export async function apiAdminGetArticles(params: {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
  hasStats?: "true" | "false" | "all";
}): Promise<AdminArticlesResponse> {
  const urlParams = new URLSearchParams();
  if (params.page) urlParams.append("page", String(params.page));
  if (params.limit) urlParams.append("limit", String(params.limit));
  if (params.search) urlParams.append("search", params.search);
  if (params.source) urlParams.append("source", params.source);
  if (params.hasStats) urlParams.append("hasStats", params.hasStats);
  return adminApiFetch<AdminArticlesResponse>(
    `/api/admin/articles?${urlParams}`,
  );
}

export async function apiAdminDeleteOrphanArticles(): Promise<{
  ok: true;
  deletedCount: number;
}> {
  return adminApiFetch<{ ok: true; deletedCount: number }>(
    "/api/admin/articles/orphans",
    {
      method: "DELETE",
      body: JSON.stringify({ confirm: true }),
    },
  );
}

// ========== Storage Management ==========

export type AdminFile = {
  id: string;
  project_id: string;
  project_name: string | null;
  name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  category: string;
  description: string | null;
  uploader_email: string | null;
  created_at: string;
};

export type AdminStorageResponse = {
  files: AdminFile[];
  total: number;
  page: number;
  totalPages: number;
  summary: { category: string; count: number; total_size: number }[];
};

export async function apiAdminGetStorage(params: {
  page?: number;
  limit?: number;
  category?: string;
  projectId?: string;
}): Promise<AdminStorageResponse> {
  const urlParams = new URLSearchParams();
  if (params.page) urlParams.append("page", String(params.page));
  if (params.limit) urlParams.append("limit", String(params.limit));
  if (params.category) urlParams.append("category", params.category);
  if (params.projectId) urlParams.append("projectId", params.projectId);
  return adminApiFetch<AdminStorageResponse>(`/api/admin/storage?${urlParams}`);
}

// ========== System Health ==========

export type AdminHealthResponse = {
  database: {
    active_connections: number;
    total_connections: number;
    max_connections: number;
    database_size: number;
  };
  tables: { table_name: string; row_count: number; total_size: number }[];
  cache: { cache_entries: number; expired_entries: number };
  pool: { totalCount: number; idleCount: number; waitingCount: number };
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  nodeVersion: string;
};

export async function apiAdminGetHealth(): Promise<AdminHealthResponse> {
  return adminApiFetch<AdminHealthResponse>("/api/admin/health");
}

// ========== Analytics & Retention ==========

export type AdminRetentionResponse = {
  dau: { date: string; count: number }[];
  wau: { week: string; count: number }[];
  mau: { month: string; count: number }[];
  newUsers: { week: string; count: number }[];
  churnedUsers: number;
};

export async function apiAdminGetRetention(): Promise<AdminRetentionResponse> {
  return adminApiFetch<AdminRetentionResponse>(
    "/api/admin/analytics/retention",
  );
}

// ========== System Config ==========

export type AdminConfigResponse = {
  config: {
    maxProjectsPerUser: number;
    maxDocumentsPerProject: number;
    maxFileSizeMb: number;
    maxStoragePerUserMb: number;
    rateLimits: {
      register: string;
      login: string;
      api: string;
    };
    features: {
      aiErrorAnalysis: boolean;
      aiProtocolCheck: boolean;
      fileExtraction: boolean;
    };
  };
};

export async function apiAdminGetConfig(): Promise<AdminConfigResponse> {
  return adminApiFetch<AdminConfigResponse>("/api/admin/config");
}

// ========== Bulk Operations ==========

export async function apiAdminBulkBlockUsers(
  userIds: string[],
  blocked: boolean,
  reason?: string,
): Promise<{ ok: true; affectedCount: number }> {
  return adminApiFetch<{ ok: true; affectedCount: number }>(
    "/api/admin/users/bulk-block",
    {
      method: "POST",
      body: JSON.stringify({ userIds, blocked, reason }),
    },
  );
}

// ========== Cleanup Operations ==========

export async function apiAdminCleanupExpiredCache(): Promise<{
  ok: true;
  deletedCount: number;
}> {
  return adminApiFetch<{ ok: true; deletedCount: number }>(
    "/api/admin/cleanup/expired-cache",
    {
      method: "POST",
    },
  );
}

export async function apiAdminCleanupOldSessions(
  olderThanDays: number,
): Promise<{ ok: true; deletedCount: number }> {
  return adminApiFetch<{ ok: true; deletedCount: number }>(
    "/api/admin/cleanup/old-sessions",
    {
      method: "POST",
      body: JSON.stringify({ olderThanDays }),
    },
  );
}

export async function apiAdminCleanupOldActivity(
  olderThanDays: number,
): Promise<{ ok: true; deletedCount: number }> {
  return adminApiFetch<{ ok: true; deletedCount: number }>(
    "/api/admin/cleanup/old-activity",
    {
      method: "POST",
      body: JSON.stringify({ olderThanDays }),
    },
  );
}
