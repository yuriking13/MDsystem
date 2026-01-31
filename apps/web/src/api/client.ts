// apps/web/src/api/client.ts
export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

const TOKEN_KEY = "mdsystem_token";
const REFRESH_TOKEN_KEY = "mdsystem_refresh_token";

// Флаг для предотвращения множественных запросов на обновление токена
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  setToken(accessToken);
  setRefreshToken(refreshToken);
}

/**
 * Попытка обновить access token используя refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // Refresh token недействителен - очищаем всё
      clearToken();
      return null;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearToken();
    return null;
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body)
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  // Если получили 401 с TokenExpired, пробуем обновить токен
  if (res.status === 401) {
    const errorData = await res.json().catch(() => ({}));

    if (errorData.error === "TokenExpired" && getRefreshToken()) {
      // Если уже идёт обновление - ждём его завершения
      if (isRefreshing) {
        return new Promise<T>((resolve, reject) => {
          addRefreshSubscriber(async (newToken: string) => {
            headers.set("Authorization", `Bearer ${newToken}`);
            try {
              const retryRes = await fetch(`${API_BASE}${path}`, {
                ...init,
                headers,
              });
              if (!retryRes.ok) {
                const text = await retryRes.text().catch(() => "");
                reject(
                  new Error(
                    `API ${retryRes.status}: ${text || retryRes.statusText}`,
                  ),
                );
              } else {
                const ct = retryRes.headers.get("content-type") || "";
                if (ct.includes("application/json"))
                  resolve((await retryRes.json()) as T);
                else resolve((await retryRes.text()) as T);
              }
            } catch (e) {
              reject(e);
            }
          });
        });
      }

      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onTokenRefreshed(newToken);
        // Повторяем запрос с новым токеном
        headers.set("Authorization", `Bearer ${newToken}`);
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...init,
          headers,
        });

        if (!retryRes.ok) {
          const text = await retryRes.text().catch(() => "");
          throw new Error(
            `API ${retryRes.status}: ${text || retryRes.statusText}`,
          );
        }

        const ct = retryRes.headers.get("content-type") || "";
        if (ct.includes("application/json"))
          return (await retryRes.json()) as T;
        return (await retryRes.text()) as T;
      }
    }

    // Если не удалось обновить токен - выбрасываем ошибку
    throw new Error(`API 401: Unauthorized`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as T;
}
