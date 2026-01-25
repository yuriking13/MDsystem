import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiAdminMe, type AdminUser } from "./adminApi";
import { getAdminToken, setAdminToken, clearAdminToken } from "./adminToken";

export { getAdminToken, setAdminToken, clearAdminToken };

type AdminAuthState = {
  token: string | null;
  admin: AdminUser | null;
  loading: boolean;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
};

const AdminCtx = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshAdmin() {
    const t = getAdminToken();
    if (!t) {
      setAdmin(null);
      return;
    }
    try {
      const res = await apiAdminMe();
      setAdmin(res.user);
    } catch {
      logout();
    }
  }

  async function loginWithToken(t: string) {
    setAdminToken(t);
    setTokenState(t);
    await refreshAdmin();
  }

  function logout() {
    clearAdminToken();
    setTokenState(null);
    setAdmin(null);
  }

  useEffect(() => {
    const t = getAdminToken();
    if (!t) {
      setLoading(false);
      return;
    }
    setTokenState(t);
    refreshAdmin()
      .catch(() => logout())
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AdminAuthState>(
    () => ({ token, admin, loading, loginWithToken, logout, refreshAdmin }),
    [token, admin, loading]
  );

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

export function useAdminAuth() {
  const v = useContext(AdminCtx);
  if (!v) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return v;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAdminAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  }

  return <>{children}</>;
}
