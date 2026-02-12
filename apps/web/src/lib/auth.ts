const TOKEN_KEY = "mdsystem_token";
const REFRESH_TOKEN_KEY = "mdsystem_refresh_token";

function emitAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-token-changed"));
  }
}

export function getToken(): string | null {
  const t = localStorage.getItem(TOKEN_KEY);
  return t && t.trim().length > 0 ? t : null;
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  emitAuthChange();
}

export function getRefreshToken(): string | null {
  const t = localStorage.getItem(REFRESH_TOKEN_KEY);
  return t && t.trim().length > 0 ? t : null;
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
  emitAuthChange();
}

export function setAuthTokens(
  accessToken: string,
  refreshToken?: string | null,
) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  emitAuthChange();
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  emitAuthChange();
}
