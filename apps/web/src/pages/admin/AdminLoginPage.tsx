import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { getErrorMessage } from "../../lib/errorUtils";
import { apiAdminLogin } from "../../lib/adminApi";
import { useAdminAuth } from "../../lib/AdminContext";
import { IconShield, IconKey, IconLock } from "../../components/FlowbiteIcons";
import "../../styles/admin.css";

export default function AdminLoginPage() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const { loginWithToken } = useAdminAuth();

  const redirectTo = loc.state?.from || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [showTokenField, setShowTokenField] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiAdminLogin(
        email.trim(),
        password,
        showTokenField ? adminToken : undefined,
      );
      await loginWithToken(res.token);
      nav(redirectTo, { replace: true });
    } catch (err) {
      if (getErrorMessage(err).includes("requiresToken")) {
        setShowTokenField(true);
        setError("Требуется токен администратора");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-login-icon">
              <IconShield size="lg" />
            </div>
            <h1>Панель администратора</h1>
            <p className="admin-login-subtitle">Scientiaiter Admin</p>
          </div>

          {error && (
            <div className="alert admin-alert">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="admin-login-form">
            <div className="admin-field">
              <label htmlFor="email">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                  />
                </svg>
                Email администратора
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="admin-field">
              <label htmlFor="password">
                <IconLock size="sm" />
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {showTokenField && (
              <div className="admin-field admin-token-field">
                <label htmlFor="adminToken">
                  <IconKey size="sm" />
                  Токен администратора (2FA)
                </label>
                <input
                  id="adminToken"
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="Введите токен"
                  autoComplete="off"
                />
                <p className="admin-field-hint">
                  Введите специальный токен для дополнительной защиты
                </p>
              </div>
            )}

            <button
              type="submit"
              className="btn admin-login-btn"
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="admin-spinner"></span>
                  Вход...
                </>
              ) : (
                <>
                  <IconShield size="sm" />
                  Войти в панель управления
                </>
              )}
            </button>
          </form>

          <div className="admin-login-footer">
            <Link to="/login" className="admin-back-link">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Вернуться к обычному входу
            </Link>
          </div>
        </div>

        <div className="admin-login-info">
          <div className="admin-info-card">
            <h3>Доступ к админ-панели</h3>
            <ul>
              <li>
                <IconShield size="sm" className="text-accent" />
                <span>Требуются права администратора</span>
              </li>
              <li>
                <IconKey size="sm" className="text-warning" />
                <span>Возможна двухфакторная аутентификация</span>
              </li>
              <li>
                <IconLock size="sm" className="text-success" />
                <span>Все действия логируются</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
