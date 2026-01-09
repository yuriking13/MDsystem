import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!agreeTerms) {
      setError("Необходимо согласиться с условиями");
      return;
    }

    setBusy(true);
    
    // Имитация отправки email (функционал пока не реализован)
    setTimeout(() => {
      setSuccess(true);
      setBusy(false);
    }, 1000);
  }

  return (
    <section className="auth-page">
      <div className="auth-container">
        <div className="auth-grid">
          {/* Left side - Feature list */}
          <div className="auth-features">
            <a href="/" className="auth-logo">
              <svg className="auth-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              MDsystem
            </a>

            <div className="auth-features-list">
              <div className="auth-feature">
                <svg className="auth-feature-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3>Умный поиск статей</h3>
                  <p>Интеграция с PubMed, DOAJ, Wiley для поиска научных публикаций по ключевым словам и MeSH терминам.</p>
                </div>
              </div>

              <div className="auth-feature">
                <svg className="auth-feature-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3>Граф цитирований</h3>
                  <p>Визуализация связей между статьями, выявление ключевых работ и анализ citation network.</p>
                </div>
              </div>

              <div className="auth-feature">
                <svg className="auth-feature-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3>AI-ассистент</h3>
                  <p>Интеллектуальный помощник для формирования поисковых запросов и анализа результатов.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Forgot password form */}
          <div className="auth-form-container">
            <div className="auth-form-card">
              <h1 className="auth-title">Забыли пароль?</h1>
              <p className="auth-description">
                Мы отправим инструкции по сбросу пароля на ваш email. Если у вас нет доступа к email, попробуйте{" "}
                <a href="#" className="auth-link">восстановление аккаунта</a>.
              </p>
              
              {success ? (
                <div className="auth-success">
                  <svg className="auth-success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Если аккаунт с таким email существует, мы отправили инструкции по сбросу пароля.</p>
                  <Link to="/login" className="auth-submit" style={{ marginTop: 16, textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                    Вернуться к входу
                  </Link>
                </div>
              ) : (
                <form onSubmit={submit} className="auth-form">
                  <div className="auth-field">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Введите ваш email"
                      autoComplete="email"
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
                        Я согласен с{" "}
                        <a href="#" className="auth-link">Условиями использования</a> и{" "}
                        <a href="#" className="auth-link">Политикой конфиденциальности</a>.
                      </span>
                    </label>
                  </div>

                  {error && <div className="auth-error">{error}</div>}

                  <div className="auth-actions">
                    <button type="submit" className="auth-submit" disabled={busy}>
                      {busy ? "Отправка..." : "Сбросить пароль"}
                    </button>
                    <Link to="/login" className="auth-link-btn">
                      Вернуться к входу
                    </Link>
                  </div>
                </form>
              )}
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
