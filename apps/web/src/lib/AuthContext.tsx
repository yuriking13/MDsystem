import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import { clearToken, getToken, setAuthTokens } from "./auth";
import { apiMe, type AuthUser } from "./api";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  loginWithToken: (
    token: string,
    refreshToken?: string | null,
  ) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const t = getToken();
    if (!t) {
      setUser(null);
      return;
    }
    const me = await apiMe();
    setUser(me.user);
  }

  async function loginWithToken(t: string, refreshToken?: string | null) {
    setAuthTokens(t, refreshToken);
    setTokenState(t);
    await refreshMe();
  }

  function logout() {
    clearToken();
    setTokenState(null);
    setUser(null);
  }

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    setTokenState(t);
    refreshMe()
      .catch(() => logout())
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const syncAuthState = () => {
      const t = getToken();
      setTokenState(t);
      if (!t) {
        setUser(null);
      }
    };

    window.addEventListener("auth-token-changed", syncAuthState);
    return () =>
      window.removeEventListener("auth-token-changed", syncAuthState);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ token, user, loading, loginWithToken, logout, refreshMe }),
    [token, user, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="container">Loading…</div>;
  if (!token)
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  return <>{children}</>;
}
