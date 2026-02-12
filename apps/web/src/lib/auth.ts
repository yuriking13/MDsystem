const TOKEN_KEY = "mdsystem_token";
const REFRESH_TOKEN_KEY = "mdsystem_refresh_token";

export function getToken(): string | null {
  const t = localStorage.getItem(TOKEN_KEY);
  return t && t.trim().length > 0 ? t : null;
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  const t = localStorage.getItem(REFRESH_TOKEN_KEY);
  return t && t.trim().length > 0 ? t : null;
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/**
 * Try to refresh the access token using the refresh token.
 * Returns the new access token or null if refresh failed.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // Refresh token expired or invalid - clear everything
      clearToken();
      return null;
    }

    const data = await res.json();
    if (data.accessToken) {
      setToken(data.accessToken);
    }
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
    return data.accessToken || null;
  } catch {
    return null;
  }
}
