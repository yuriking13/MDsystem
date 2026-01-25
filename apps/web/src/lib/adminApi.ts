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
  action_detail: any;
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
  request_body: any;
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
  details: any;
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
  adminToken?: string
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

export async function apiAdminGenerateToken(): Promise<{ token: string; message: string }> {
  return adminApiFetch<{ token: string; message: string }>("/api/admin/generate-token", {
    method: "POST",
  });
}

export async function apiAdminStats(): Promise<AdminStats> {
  return adminApiFetch<AdminStats>("/api/admin/stats");
}

// Users
export async function apiAdminGetUsers(
  page = 1,
  limit = 20,
  search?: string
): Promise<UsersListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.append("search", search);
  return adminApiFetch<UsersListResponse>(`/api/admin/users?${params}`);
}

export async function apiAdminGetUser(userId: string): Promise<UserDetailResponse> {
  return adminApiFetch<UserDetailResponse>(`/api/admin/users/${userId}`);
}

export async function apiAdminUpdateUserAdmin(
  userId: string,
  isAdmin: boolean
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
  return adminApiFetch<ActivityListResponse>(`/api/admin/activity?${urlParams}`);
}

export async function apiAdminGetCalendar(
  year: number,
  month: number,
  userId?: string
): Promise<CalendarResponse> {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  if (userId) params.append("userId", userId);
  return adminApiFetch<CalendarResponse>(`/api/admin/activity/calendar?${params}`);
}

export async function apiAdminGetDailyActivity(
  date: string,
  userId?: string
): Promise<DailyActivityResponse> {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  return adminApiFetch<DailyActivityResponse>(`/api/admin/activity/daily/${date}?${params}`);
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
  notes?: string
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
