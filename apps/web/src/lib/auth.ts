const TOKEN_KEY = "mdsystem_token";

export function getToken(): string | null {
  const t = localStorage.getItem(TOKEN_KEY);
  return t && t.trim().length > 0 ? t : null;
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
