import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../lib/LanguageContext";
import "../styles/professional-landing.css";
import LandingFooter from "../components/LandingFooter";

function getFaces(t: (ru: string, en: string) => string) {
  return [
    {
      name: t("Основатель проекта", "Project Founder"),
      role: "Product & Research Lead",
      description: t(
        "Формирует научную стратегию платформы, развивает методологию анализа и определяет дорожную карту продукта.",
        "Shapes the scientific strategy of the platform, develops analysis methodology and defines the product roadmap.",
      ),
    },
    {
      name: t("Инженерная команда", "Engineering Team"),
      role: "Platform Engineering",
      description: t(
        "Отвечает за инфраструктуру, качество данных, масштабируемость поиска и скорость графовых вычислений.",
        "Responsible for infrastructure, data quality, search scalability and graph computation speed.",
      ),
    },
    {
      name: t("AI-направление", "AI Direction"),
      role: "Applied AI",
      description: t(
        "Развивает семантические модели, кластеры и автоматические подсказки для исследовательских сценариев.",
        "Develops semantic models, clusters and automatic suggestions for research scenarios.",
      ),
    },
  ];
}

export default function ProjectFacesPage() {
  const { t, lang: language } = useLanguage();
  const faces = getFaces(t);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    document.documentElement.className = theme === "dark" ? "dark" : "";
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === "light" ? "dark" : "light"));
  const toggleLanguage = () => {
    /* language is managed by context — use its toggle if available */
  };

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
            <Link
              to="/login"
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${theme === "dark" ? "text-white bg-teal-700 hover:bg-teal-800" : "text-white bg-slate-900 hover:bg-slate-800"}`}
            >
              {t("Войти", "Sign In")}
            </Link>
          </div>
        </div>
      </header>

      <main className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <h1
            className={`text-4xl md:text-5xl font-light mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
          >
            {t("Лица проекта", "Project Faces")}
          </h1>
          <p
            className={`text-lg mb-10 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
          >
            {t(
              "Раздел команды в демо-режиме. Временно используется логотип вместо персональных фотографий.",
              "Team section in demo mode. Logo is used temporarily instead of personal photos.",
            )}
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {faces.map((face) => (
              <article
                key={face.name}
                className={`rounded-2xl p-6 ${theme === "dark" ? "bg-slate-800/60 text-slate-300" : "bg-white text-slate-700 shadow-sm"}`}
              >
                <img
                  src="https://storage.yandexcloud.net/scentiaiterpublic/landing/logo_scientiaiter_no_name_bw_nobg_small.png"
                  alt={face.name}
                  className="w-16 h-16 object-contain mb-4 rounded-xl"
                />
                <h3
                  className={`text-lg font-semibold mb-1 ${theme === "dark" ? "text-white" : "text-slate-900"}`}
                >
                  {face.name}
                </h3>
                <p
                  className={`text-sm font-medium mb-2 ${theme === "dark" ? "text-teal-400" : "text-teal-700"}`}
                >
                  {face.role}
                </p>
                <p className="text-sm">{face.description}</p>
              </article>
            ))}
          </div>
        </div>
      </main>

      <LandingFooter language={language} theme={theme} />
    </div>
  );
}
