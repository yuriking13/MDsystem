import { apiFetch } from "../lib/api";
import {
  clearToken as clearAuthTokens,
  getRefreshToken as getStoredRefreshToken,
  getToken as getStoredToken,
  setAuthTokens,
  setRefreshToken as setStoredRefreshToken,
  setToken as setStoredToken,
} from "../lib/auth";

export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

function normalizeApiPath(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.startsWith("/api")) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${API_BASE}${path}`;
  }
  return `${API_BASE}/${path}`;
}

export function getToken(): string | null {
  return getStoredToken();
}

export function setToken(token: string) {
  setStoredToken(token);
}

export function getRefreshToken(): string | null {
  return getStoredRefreshToken();
}

export function setRefreshToken(token: string) {
  setStoredRefreshToken(token);
}

export function clearToken() {
  clearAuthTokens();
}

export function setTokens(accessToken: string, refreshToken: string) {
  setAuthTokens(accessToken, refreshToken);
}

/**
 * Backward-compatible facade over the unified apiFetch/auth layer.
 */
export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(normalizeApiPath(path), { ...init, auth: true });
}
