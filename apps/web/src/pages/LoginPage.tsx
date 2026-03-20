import React, { useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { apiLogin } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { parseApiError, getErrorMessage } from "../lib/errors";
import { useLanguage } from "../lib/LanguageContext";

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const { loginWithToken } = useAuth();
  const { t } = useLanguage();

  const redirectTo = useMemo(() => loc.state?.from || "/projects", [loc.state]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiLogin(email.trim(), password);
      await loginWithToken(res.token, res.refreshToken);
      nav(redirectTo, { replace: true });
    } catch (err: unknown) {
      setError(parseApiError(getErrorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-container">
        <div className="auth-grid">
          {/* Left side - Feature list */}
          <div className="auth-features">
            <Link to="/" className="auth-logo">
              <img
                src="/logo.svg"
                alt="Scientiaiter Logo"
                className="auth-logo-icon w-6 h-6"
              />
              Scientiaiter
            </Link>

            <div className="auth-features-list">
              <div className="auth-feature">
                <svg
                  className="auth-feature-icon"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3>{t("Умный поиск статей", "Smart Article Search")}</h3>
                  <p>
                    {t(
                      "Интеграция с PubMed, DOAJ, Wiley для поиска научных публикаций по ключевым словам и MeSH терминам.",
                      "Integration with PubMed, DOAJ, Wiley for searching scientific publications by keywords and MeSH terms.",
                    )}
                  </p>
                </div>
              </div>

              <div className="auth-feature">
                <svg
                  className="auth-feature-icon"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3>{t("Граф цитирований", "Citation Graph")}</h3>
                  <p>
                    {t(
                      "Визуализация связей между статьями, выявление ключевых работ и анализ citation network.",
                      "Visualization of article connections, identification of key works and citation network analysis.",
                    )}
                  </p>
                </div>
              </div>

              <div className="auth-feature">
                <svg
                  className="auth-feature-icon"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3>{t("AI-ассистент", "AI Assistant")}</h3>
                  <p>
                    {t(
                      "Интеллектуальный помощник для формирования поисковых запросов и анализа результатов.",
                      "Intelligent assistant for creating search queries and analyzing results.",
                    )}
                  </p>
                </div>
              </div>

              <div className="auth-feature">
                <svg
                  className="auth-feature-icon"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3>{t("Редактор документов", "Document Editor")}</h3>
                  <p>
                    {t(
                      "Создание научных обзоров с автоматической вставкой цитирований и генерацией библиографии.",
                      "Creating scientific reviews with automatic citation insertion and bibliography generation.",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="auth-form-container">
            <div className="auth-form-card">
              <h1 className="auth-title">{t("Добро пожаловать", "Welcome")}</h1>

              <form onSubmit={submit} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    data-testid="login-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="password">{t("Пароль", "Password")}</label>
                  <input
                    type="password"
                    id="password"
                    data-testid="login-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="auth-options">
                  <span className="auth-link">
                    {t(
                      "Сброс пароля временно отключен, обратитесь к администратору",
                      "Password reset is temporarily disabled, contact administrator",
                    )}
                  </span>
                </div>

                {error && (
                  <div className="auth-error" role="alert" aria-live="polite">
                    {error}
                  </div>
                )}

                <div className="auth-actions">
                  <button
                    type="submit"
                    className="auth-submit"
                    data-testid="login-submit-button"
                    disabled={busy}
                  >
                    {busy
                      ? t("Вход...", "Signing in...")
                      : t("Войти в аккаунт", "Sign in")}
                  </button>
                  <Link to="/" className="auth-link-btn auth-link-btn--button">
                    {t("На лендинг", "To landing")}
                  </Link>
                </div>

                <p className="auth-footer-text">
                  {t("Нет аккаунта?", "No account?")}{" "}
                  <Link to="/register" className="auth-link">
                    {t("Зарегистрироваться", "Sign up")}
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      <footer className="auth-footer">
        <span>
          © 2024-2026 Scientiaiter.{" "}
          {t("Все права защищены.", "All rights reserved.")}
        </span>
      </footer>
    </section>
  );
}
