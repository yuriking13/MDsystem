import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiRegister } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { parseApiError, getErrorMessage } from "../lib/errors";
import { useLanguage } from "../lib/LanguageContext";
import "../styles/professional-landing.css";
import LandingFooter from "../components/LandingFooter";

export default function RegisterPage() {
  const nav = useNavigate();
  const { loginWithToken } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const language = (t("ru", "en") === "ru" ? "ru" : "en") as "ru" | "en";

  useEffect(() => {
    document.documentElement.className = theme === "dark" ? "dark" : "";
  }, [theme]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(
        t(
          "Пароль должен быть минимум 8 символов",
          "Password must be at least 8 characters",
        ),
      );
      return;
    }

    if (!agreeTerms) {
      setError(
        t(
          "Необходимо согласиться с условиями использования",
          "Must agree to terms of service",
        ),
      );
      return;
    }

    setBusy(true);
    try {
      const res = await apiRegister(email.trim(), password);
      await loginWithToken(res.token, res.refreshToken);
      nav("/projects", { replace: true });
    } catch (err: unknown) {
      setError(parseApiError(getErrorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`professional-landing min-h-screen transition-colors duration-300 flex flex-col ${theme === "dark" ? "bg-slate-900 landing-style-bch" : "bg-slate-50 landing-style-chb"}`}
    >
      <header className="relative z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className={`brand-name-stack ${theme === "dark" ? "text-white" : "text-slate-900"}`}
          >
            <img
              src="https://storage.yandexcloud.net/scentiaiterpublic/landing/logo_scientiaiter_no_name_bw_nobg_small.png"
              alt=""
              className="brand-name-logo"
            />
            <div className="brand-name-text">
              <span className="brand-name-primary">Scientiaiter</span>
              <span className="brand-name-subtitle">
                {language === "ru" ? "Путь знания" : "Path of Knowledge"}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                setTheme((p) => (p === "light" ? "dark" : "light"))
              }
              className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "text-yellow-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {theme === "dark" ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="landing-auth-card">
          <h1
            className={`text-3xl font-light mb-8 text-center ${theme === "dark" ? "text-white" : "text-slate-900"}`}
          >
            {t("Создать аккаунт", "Create Account")}
          </h1>

          <form onSubmit={submit} className="landing-auth-form">
            <div className="landing-auth-field">
              <label
                htmlFor="email"
                className={
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                data-testid="register-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
                className={`landing-auth-input ${theme === "dark" ? "landing-auth-input--dark" : ""}`}
              />
            </div>

            <div className="landing-auth-field">
              <label
                htmlFor="password"
                className={
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }
              >
                {t("Пароль", "Password")}{" "}
                <span
                  className={`text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
                >
                  ({t("минимум 8 символов", "min 8 characters")})
                </span>
              </label>
              <input
                type="password"
                id="password"
                data-testid="register-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                required
                className={`landing-auth-input ${theme === "dark" ? "landing-auth-input--dark" : ""}`}
              />
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                data-testid="register-terms-checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1"
              />
              <span
                className={
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }
              >
                {t(
                  "Регистрируясь, вы соглашаетесь с",
                  "By registering, you agree to the",
                )}{" "}
                <Link to="/terms" className="underline hover:no-underline">
                  {t("Условиями использования", "Terms of Service")}
                </Link>{" "}
                {t("и", "and")}{" "}
                <Link to="/privacy" className="underline hover:no-underline">
                  {t("Политикой конфиденциальности", "Privacy Policy")}
                </Link>
                .
              </span>
            </label>

            {error && (
              <div
                className="landing-auth-error"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="landing-auth-submit"
              data-testid="register-submit-button"
              disabled={busy}
            >
              {busy
                ? t("Создание...", "Creating...")
                : t("Создать аккаунт", "Create")}
            </button>

            <p
              className={`text-sm text-center ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
            >
              {t("Уже есть аккаунт?", "Already have an account?")}{" "}
              <Link
                to="/login"
                className="underline hover:no-underline font-medium"
              >
                {t("Войти", "Sign in")}
              </Link>
            </p>
          </form>
        </div>
      </main>

      <LandingFooter language={language} theme={theme} />
    </div>
  );
}
