import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../lib/LanguageContext";

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
  const { t } = useLanguage();
  const faces = getFaces(t);

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/" className="public-brand">
            <img
              src="/logo.svg"
              alt="Scientiaiter"
              className="public-brand-logo"
            />
            <span>Scientiaiter</span>
          </Link>
          <div className="public-header-actions">
            <Link to="/" className="public-btn public-btn-secondary">
              {t("На лендинг", "To Landing")}
            </Link>
            <Link to="/offer" className="public-btn public-btn-secondary">
              {t("Оферта", "Terms")}
            </Link>
            <Link to="/login" className="public-btn">
              {t("Войти", "Sign In")}
            </Link>
          </div>
        </div>
      </header>

      <main className="public-main">
        <section className="public-section">
          <div className="public-section-header">
            <h1>{t("Лица проекта", "Project Faces")}</h1>
            <p>
              {t(
                "Раздел команды в демо-режиме. Временно используется логотип вместо персональных фотографий.",
                "Team section in demo mode. Logo is used temporarily instead of personal photos.",
              )}
            </p>
          </div>

          <div className="public-grid public-grid-3">
            {faces.map((face) => (
              <article className="public-card public-face-card" key={face.name}>
                <img
                  src="/logo.svg"
                  alt={face.name}
                  className="public-face-logo"
                />
                <h3>{face.name}</h3>
                <p className="public-face-role">{face.role}</p>
                <p>{face.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
