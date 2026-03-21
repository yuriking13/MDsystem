import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/professional-landing.css";
import LandingFooter from "../components/LandingFooter";

export default function PublicOfferPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"ru" | "en">("ru");

  useEffect(() => {
    document.documentElement.className = theme === "dark" ? "dark" : "";
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === "light" ? "dark" : "light"));
  const toggleLanguage = () => setLanguage((p) => (p === "ru" ? "en" : "ru"));
  const t = {
    ru: {
      title: "Публичная оферта",
      subtitle:
        "Базовая версия документа. Текст можно заменить юридически финальной редакцией.",
    },
    en: {
      title: "Public Offer",
      subtitle:
        "Base document version. The text can be replaced with the legally final edition.",
    },
  }[language];

  return (
    <div
      className={`professional-landing min-h-screen transition-colors duration-300 ${theme === "dark" ? "bg-slate-900 landing-style-bch" : "bg-slate-50 landing-style-chb"}`}
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
              onClick={toggleTheme}
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
            <button
              onClick={toggleLanguage}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {language === "ru" ? "EN" : "RU"}
            </button>
            <Link
              to="/login"
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${theme === "dark" ? "text-white bg-teal-700 hover:bg-teal-800" : "text-white bg-slate-900 hover:bg-slate-800"}`}
            >
              {language === "ru" ? "Войти" : "Log in"}
            </Link>
          </div>
        </div>
      </header>

      <main className="px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h1
            className={`text-4xl md:text-5xl font-light mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
          >
            {t.title}
          </h1>
          <p
            className={`text-lg mb-10 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
          >
            {t.subtitle}
          </p>

          <article
            className={`rounded-2xl p-8 space-y-6 ${theme === "dark" ? "bg-slate-800/60 text-slate-300" : "bg-white text-slate-700 shadow-sm"}`}
          >
            <section>
              <h2
                className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                1. Общие положения
              </h2>
              <p>
                Настоящий документ является предложением заключить договор на
                использование платформы Scientiaiter для поиска, анализа и
                организации научных публикаций.
              </p>
            </section>
            <section>
              <h2
                className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                2. Предмет оферты
              </h2>
              <p>
                Исполнитель предоставляет доступ к функционалу сервиса, включая
                управление проектами, библиотекой статей, инструментами графа
                цитирования и AI-модулями.
              </p>
            </section>
            <section>
              <h2
                className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                3. Порядок акцепта
              </h2>
              <p>
                Акцептом оферты считается регистрация в сервисе и/или начало
                фактического использования платформы пользователем.
              </p>
            </section>
            <section>
              <h2
                className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                4. Стоимость и оплата
              </h2>
              <p>
                Условия тарификации, сроки оплаты и доступные планы определяются
                в интерфейсе сервиса и могут обновляться с уведомлением
                пользователя.
              </p>
            </section>
            <section>
              <h2
                className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                5. Права и обязанности сторон
              </h2>
              <ul
                className={`list-disc pl-6 space-y-1 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}
              >
                <li>
                  Пользователь обязуется использовать сервис в законных целях.
                </li>
                <li>
                  Исполнитель обеспечивает работоспособность платформы в
                  пределах разумной доступности.
                </li>
                <li>
                  Пользователь несёт ответственность за корректность вводимых
                  данных и соблюдение прав третьих лиц.
                </li>
              </ul>
            </section>
            <section>
              <h2
                className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                6. Ограничение ответственности
              </h2>
              <p>
                Платформа предоставляется по модели &quot;as is&quot;.
                Исполнитель не несёт ответственности за косвенные убытки,
                вызванные использованием или невозможностью использования
                сервиса.
              </p>
            </section>
            <section>
              <h2
                className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
              >
                7. Заключительные положения
              </h2>
              <p>
                Исполнитель вправе вносить изменения в настоящую оферту. Новая
                редакция вступает в силу с момента публикации на сайте.
              </p>
            </section>
          </article>
        </div>
      </main>

      <LandingFooter language={language} theme={theme} />
    </div>
  );
}
