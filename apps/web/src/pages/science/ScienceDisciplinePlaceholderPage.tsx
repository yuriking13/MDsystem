import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  getDisciplineBySlug,
  getScienceDisciplineHref,
  isScienceDisciplineSlug,
} from "../../lib/scienceDomains";

export default function ScienceDisciplinePlaceholderPage() {
  const { discipline = "" } = useParams();

  if (!isScienceDisciplineSlug(discipline) || discipline === "med") {
    return (
      <div className="public-page science-page">
        <main className="public-main">
          <section className="public-section">
            <article className="public-card">
              <h1>Раздел не найден</h1>
              <p>
                Указанная научная область отсутствует. Вернитесь в каталог и
                выберите доступное направление.
              </p>
              <div className="public-hero-actions">
                <Link to="/science" className="public-btn">
                  К научному лендингу
                </Link>
              </div>
            </article>
          </section>
        </main>
      </div>
    );
  }

  const info = getDisciplineBySlug(discipline);
  if (!info) {
    return (
      <div className="public-page science-page">
        <main className="public-main">
          <section className="public-section">
            <article className="public-card">
              <h1>Ошибка загрузки раздела</h1>
              <p>
                Не удалось определить выбранную научную область. Вернитесь в
                каталог и выберите направление повторно.
              </p>
              <div className="public-hero-actions">
                <Link to="/science" className="public-btn">
                  К научному лендингу
                </Link>
              </div>
            </article>
          </section>
        </main>
      </div>
    );
  }

  return (
    <ScienceDisciplinePlaceholderContent
      slug={info.slug}
      code={info.code}
      label={info.label}
      fallbackPath={info.fallbackPath}
    />
  );
}

export function ScienceDisciplinePlaceholderContent({
  slug,
  code,
  label,
  fallbackPath,
}: {
  slug: string;
  code: string;
  label: string;
  fallbackPath: string;
}) {
  const recommendedHref = isScienceDisciplineSlug(slug)
    ? getScienceDisciplineHref(slug, fallbackPath)
    : fallbackPath;

  return (
    <div className="public-page science-page">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/science" className="public-brand">
            <img
              src="/logo.svg"
              alt="MDsystem Science"
              className="public-brand-logo"
            />
            <span>MDsystem Science</span>
          </Link>
        </div>
      </header>

      <main className="public-main">
        <section className="public-section">
          <article className="public-card science-placeholder-card">
            <span className="public-badge">{code}</span>
            <h1>{label}</h1>
            <p>
              Лэндинг для направления находится в подготовке. Базовая структура
              маршрутов и поддоменов уже создана.
            </p>
            <ul className="public-list">
              <li>
                Стартовая страница направления будет расширена в следующей
                итерации.
              </li>
              <li>Стили и тема полностью соответствуют текущему проекту.</li>
              <li>
                Рекомендуемый домен для раздела: <code>{recommendedHref}</code>
              </li>
            </ul>
            <div className="public-hero-actions">
              <Link to="/science" className="public-btn">
                Вернуться к разделам науки
              </Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
