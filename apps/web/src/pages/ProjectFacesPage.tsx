import React from "react";
import { Link } from "react-router-dom";

const faces = [
  {
    name: "Основатель проекта",
    role: "Product & Research Lead",
    description:
      "Формирует научную стратегию платформы, развивает методологию анализа и определяет дорожную карту продукта.",
  },
  {
    name: "Инженерная команда",
    role: "Platform Engineering",
    description:
      "Отвечает за инфраструктуру, качество данных, масштабируемость поиска и скорость графовых вычислений.",
  },
  {
    name: "AI-направление",
    role: "Applied AI",
    description:
      "Развивает семантические модели, кластеры и автоматические подсказки для исследовательских сценариев.",
  },
];

export default function ProjectFacesPage() {
  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/landing" className="public-brand">
            <img
              src="/logo.svg"
              alt="Scientiaiter"
              className="public-brand-logo"
            />
            <span>Scientiaiter</span>
          </Link>
          <div className="public-header-actions">
            <Link to="/landing" className="public-btn public-btn-secondary">
              На лендинг
            </Link>
            <Link to="/offer" className="public-btn public-btn-secondary">
              Оферта
            </Link>
            <Link to="/login" className="public-btn">
              Войти
            </Link>
          </div>
        </div>
      </header>

      <main className="public-main">
        <section className="public-section">
          <div className="public-section-header">
            <h1>Лица проекта</h1>
            <p>
              Раздел команды в демо-режиме. Временно используется логотип вместо
              персональных фотографий.
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
