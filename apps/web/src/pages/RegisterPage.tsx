import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiRegister } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { parseApiError, getErrorMessage } from "../lib/errors";

export default function RegisterPage() {
  const nav = useNavigate();
  const { loginWithToken } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Пароль должен быть минимум 8 символов");
      return;
    }

    if (!agreeTerms) {
      setError("Необходимо согласиться с условиями использования");
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
    <section className="auth-page">
      <div className="auth-container">
        <div className="auth-grid">
          {/* Left side - Feature list */}
          <div className="auth-features">
            <a href="/" className="auth-logo">
              <svg
                className="auth-logo-icon"
                viewBox="0 0 2500 2500"
                fill="currentColor"
              >
                <path
                  d="M503906 2014.25439453 C-330.56970222 2020.78403227 -322.13090837 2027.1892256 -313.69384766 2033.59960938 C-311.01912222 2035.63499119 -308.34874803 2037.67594675 -305.6796875 2039.71875 C-294.98523592 2047.89935066 -284.21633116 2055.96597579 -273.35449219 2063.92285156 C-268.60655198 2067.40414661 -263.8703559 2070.90140836 -259.13183594 2074.39550781 C-255.20229634 2077.29223207 -251.27023147 2080.18537101 -247.33203125 2083.0703125"
                  fill="#030303"
                  transform="translate(1383.01171875,82.359375)"
                />
                <path
                  d="M0 0 C2.31 1.98 4.62 3.96 7 6 C6.01 7.485 6.01 7.485 5 9 C4.16094435 7.87926138 3.32892169 6.75325453 2.5 5.625 C2.0359375 4.99851562 1.571875 4.37203125 1.09375 3.7265625 C0 2 0 2 0 0 Z"
                  fill="#5A5B5B"
                  transform="translate(1316,948)"
                />
              </svg>
              MDsystem
            </a>

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
                  <h3>Умный поиск статей</h3>
                  <p>
                    Интеграция с PubMed, DOAJ, Wiley для поиска научных
                    публикаций по ключевым словам и MeSH терминам.
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
                  <h3>Граф цитирований</h3>
                  <p>
                    Визуализация связей между статьями, выявление ключевых работ
                    и анализ citation network.
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
                  <h3>AI-ассистент</h3>
                  <p>
                    Интеллектуальный помощник для формирования поисковых
                    запросов и анализа результатов.
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
                  <h3>Редактор документов</h3>
                  <p>
                    Создание научных обзоров с автоматической вставкой
                    цитирований и генерацией библиографии.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Register form */}
          <div className="auth-form-container">
            <div className="auth-form-card">
              <h1 className="auth-title">Создать аккаунт</h1>

              <form onSubmit={submit} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="password">
                    Пароль{" "}
                    <span className="auth-hint">(минимум 8 символов)</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>

                <div className="auth-terms">
                  <label className="auth-checkbox">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <span>
                      Регистрируясь, вы соглашаетесь с{" "}
                      <a href="#" className="auth-link">
                        Условиями использования
                      </a>{" "}
                      и{" "}
                      <a href="#" className="auth-link">
                        Политикой конфиденциальности
                      </a>
                      .
                    </span>
                  </label>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button type="submit" className="auth-submit" disabled={busy}>
                  {busy ? "Создание..." : "Создать аккаунт"}
                </button>

                <p className="auth-footer-text">
                  Уже есть аккаунт?{" "}
                  <Link to="/login" className="auth-link">
                    Войти
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      <footer className="auth-footer">
        <span>© 2024-2026 MDsystem. Все права защищены.</span>
      </footer>
    </section>
  );
}
