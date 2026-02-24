import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  SCIENCE_DISCIPLINES,
  type ScienceDisciplineSlug,
  getScienceDisciplineHref,
  getScienceMainHref,
} from "../../lib/scienceDomains";

function DisciplineCard({
  slug,
  label,
  code,
  description,
  fallbackPath,
}: {
  slug: ScienceDisciplineSlug;
  label: string;
  code: string;
  description: string;
  fallbackPath: string;
}) {
  const externalHref = getScienceDisciplineHref(slug, fallbackPath);
  const isExternal = /^https?:\/\//.test(externalHref);

  return (
    <article className="public-card science-card">
      <div className="science-card-top">
        <span className="public-badge">{code}</span>
        <h3>{label}</h3>
      </div>
      <p>{description}</p>
      <div className="public-hero-actions">
        {isExternal ? (
          <a href={externalHref} className="public-btn">
            Открыть раздел
          </a>
        ) : (
          <Link to={externalHref} className="public-btn">
            Открыть раздел
          </Link>
        )}
      </div>
    </article>
  );
}

export default function ScienceLandingPage() {
  const mainHref = useMemo(() => getScienceMainHref("/science"), []);

  return (
    <div className="public-page science-page">
      <header className="public-header">
        <div className="public-header-inner">
          <a href={mainHref} className="public-brand">
            <img
              src="/logo.svg"
              alt="MDsystem Science"
              className="public-brand-logo"
            />
            <span>MDsystem Science</span>
          </a>
          <div className="public-header-actions">
            <Link to="/login" className="public-theme-toggle">
              Войти
            </Link>
            <Link to="/register" className="public-btn">
              Создать аккаунт
            </Link>
          </div>
        </div>
      </header>

      <main className="public-main">
        <section className="public-hero">
          <article className="public-hero-content">
            <span className="public-badge">Научные направления</span>
            <h1>Единый стартовый лендинг для всех областей науки</h1>
            <p>
              Выберите дисциплину и переходите в тематический контур. Для
              медицины доступен полноценный модуль издательства и
              рецензирования.
            </p>
            <div className="public-hero-actions">
              <a
                href={getScienceDisciplineHref("med", "/med")}
                className="public-btn"
              >
                Перейти в медицинский раздел
              </a>
              <Link to="/landing" className="public-btn public-btn-secondary">
                Основной лендинг проекта
              </Link>
            </div>
          </article>
          <aside className="public-hero-panel">
            <h3>Структура поддоменов</h3>
            <ul className="public-list">
              <li>
                <strong>main:</strong> <code>***.ru</code>
              </li>
              <li>
                <strong>discipline:</strong> <code>med.***.ru</code>,{" "}
                <code>physics.***.ru</code>, <code>chemistry.***.ru</code> и
                другие.
              </li>
              <li>
                Все разделы оформлены в единой теме и стилистике текущего
                проекта.
              </li>
            </ul>
          </aside>
        </section>

        <section className="public-section">
          <div className="public-section-header">
            <h2>Каталог научных областей</h2>
            <p>
              Вкладки реализованы для медицины, физики, химии, биологии,
              астрономии, наук о Земле и экологии.
            </p>
          </div>
          <div className="public-grid public-grid-3">
            {SCIENCE_DISCIPLINES.map((discipline) => (
              <DisciplineCard key={discipline.slug} {...discipline} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
