import React, { useMemo, useState } from "react";

type HeroCard = {
  title: string;
  description: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroDescription?: string;
  metaLeft?: string;
  metaCenter?: string;
  readMoreText?: string;
  readMoreLink?: string;
  stageLabel?: string;
  highlights?: string[];
};

interface FullscreenHeroProps {
  /** Короткий крупный заголовок (1-2 слова на строку) */
  title: string;
  /** Подзаголовок под основным заголовком */
  subtitle: string;
  /** Описание справа */
  description: string;
  /** Текст CTA кнопки */
  ctaText: string;
  /** Ссылка CTA кнопки */
  ctaLink: string;
  /** Текст ссылки «Read more» */
  readMoreText?: string;
  /** Ссылка «Read more» */
  readMoreLink?: string;
  /** Метаданные слева внизу (например, город) */
  metaLeft?: string;
  /** Метаданные по центру внизу */
  metaCenter?: string;
  /** Заголовок превью следующей секции */
  nextSectionTitle?: string;
  /** Карточки для горизонтального переключения */
  cards?: HeroCard[];
  /** Номер текущего слайда */
  slideNumber?: string;
  /** Вертикальные ссылки справа */
  verticalLinks?: string[];
}

/**
 * Полноэкранный Hero блок — editorial multi-zone layout.
 * Вдохновлён стилем «Brand designer»: Grid-сетка, watermark,
 * сфера по центру, мета-данные по низу, вертикальная навигация.
 */
export default function FullscreenHero({
  title,
  subtitle,
  description,
  ctaText,
  ctaLink,
  readMoreText = "Read more",
  readMoreLink = "#features",
  metaLeft,
  metaCenter,
  nextSectionTitle,
  cards = [],
  slideNumber = "01",
  verticalLinks = [],
}: FullscreenHeroProps) {
  // Если карточки не переданы, используем fallback из текущих hero-данных.
  const resolvedCards = useMemo<HeroCard[]>(() => {
    if (cards.length > 0) {
      return cards;
    }

    return [
      {
        title: nextSectionTitle ?? "Feature Overview",
        description,
      },
    ];
  }, [cards, description, nextSectionTitle]);

  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next");

  const safeMaxIndex = Math.max(resolvedCards.length - 1, 1);
  const lightLevel = Math.round((activeCardIdx / safeMaxIndex) * 4);
  const heroLightClass = `hero-light-level-${lightLevel}`;
  const activeCard = resolvedCards[activeCardIdx] ?? resolvedCards[0];
  const resolvedSlideNumber =
    resolvedCards.length > 1
      ? String(activeCardIdx + 1).padStart(2, "0")
      : slideNumber;
  const resolvedTitle = activeCard.heroTitle ?? title;
  const resolvedSubtitle = activeCard.heroSubtitle ?? subtitle;
  const resolvedDescription = activeCard.heroDescription ?? description;
  const resolvedMetaLeft = activeCard.metaLeft ?? metaLeft;
  const resolvedMetaCenter = activeCard.metaCenter ?? metaCenter;
  const resolvedReadMoreText = activeCard.readMoreText ?? readMoreText;
  const resolvedReadMoreLink = activeCard.readMoreLink ?? readMoreLink;
  const resolvedHighlights = activeCard.highlights ?? [];

  const goPrevCard = () => {
    setSlideDirection("prev");
    setActiveCardIdx((current) =>
      current === 0 ? resolvedCards.length - 1 : current - 1,
    );
  };

  const goNextCard = () => {
    setSlideDirection("next");
    setActiveCardIdx((current) =>
      current === resolvedCards.length - 1 ? 0 : current + 1,
    );
  };

  const goToCard = (targetIndex: number) => {
    setSlideDirection(targetIndex >= activeCardIdx ? "next" : "prev");
    setActiveCardIdx(targetIndex);
  };

  return (
    <section className={`fullscreen-hero ${heroLightClass}`}>
      {/* Кинетический параллакс-фон */}
      <div className="hero-bg-orbs" aria-hidden="true">
        <div className="hero-orb hero-orb--1" />
        <div className="hero-orb hero-orb--2" />
        <div className="hero-orb hero-orb--3" />
        <div className="hero-grid-overlay" />
      </div>
      {/* Сфера — по центру, с наложением */}
      <div className="fullscreen-hero-visual">
        <img
          className="hero-sphere"
          src="https://storage.yandexcloud.net/scentiaiterpublic/landing/Cell2.png"
          alt=""
          aria-hidden="true"
        />
      </div>

      {/* Watermark — крупная полупрозрачная цифра */}
      <div className="hero-watermark" aria-hidden="true">
        {resolvedSlideNumber}
      </div>

      {/* Основная Grid-сетка */}
      <div className="hero-grid">
        {/* Левая колонка: заголовок + подзаголовок */}
        <div className="hero-left">
          <div
            key={`hero-left-copy-${activeCardIdx}`}
            className={`hero-copy-group hero-copy-group--${slideDirection}`}
          >
            {activeCard.stageLabel ? (
              <p className="hero-stage-label">{activeCard.stageLabel}</p>
            ) : null}
            <h1 className="hero-title">{resolvedTitle}</h1>
            <p className="hero-subtitle">{resolvedSubtitle}</p>
          </div>
        </div>

        {/* Правая колонка: описание + read more */}
        <div className="hero-right">
          <div
            key={`hero-right-copy-${activeCardIdx}`}
            className={`hero-detail-group hero-detail-group--${slideDirection}`}
          >
            <p className="hero-description">{resolvedDescription}</p>
            {resolvedHighlights.length > 0 ? (
              <ul className="hero-highlights">
                {resolvedHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <a href={resolvedReadMoreLink} className="hero-readmore">
              {resolvedReadMoreText}
            </a>
          </div>
        </div>

        {/* Нижняя строка: мета-данные */}
        <div className="hero-bottom-row">
          {/* Пагинация */}
          <div className="hero-pagination">
            {resolvedCards.map((card, idx) => (
              <button
                key={`${card.title}-${idx}`}
                type="button"
                className={`hero-dot ${idx === activeCardIdx ? "hero-dot--active" : ""}`}
                aria-label={`Switch to card ${idx + 1}`}
                aria-pressed={idx === activeCardIdx}
                onClick={() => goToCard(idx)}
              />
            ))}
          </div>

          {/* Мета-лево */}
          {resolvedMetaLeft && (
            <div className="hero-meta hero-meta--left">
              <span className="hero-meta-marker" aria-hidden="true" />
              <span>{resolvedMetaLeft}</span>
            </div>
          )}

          {/* Мета-центр */}
          {resolvedMetaCenter && (
            <div className="hero-meta hero-meta--center">
              <span className="hero-meta-marker" aria-hidden="true" />
              <span>{resolvedMetaCenter}</span>
            </div>
          )}

          {/* Карточки справа: рабочий слайдер с переключением влево/вправо */}
          <div className="hero-card-slider" aria-label="Hero feature cards">
            <button
              type="button"
              className="hero-card-nav hero-card-nav--prev"
              onClick={goPrevCard}
              aria-label="Previous card"
            >
              &#8249;
            </button>

            <div className="hero-card-viewport">
              <article
                key={`hero-card-${activeCardIdx}`}
                className={`hero-preview-card hero-preview-card--${slideDirection}`}
              >
                <div className="hero-next-number">
                  {String(activeCardIdx + 1).padStart(2, "0")}
                </div>
                <h3 className="hero-preview-title">{activeCard.title}</h3>
                <p className="hero-next-label">{activeCard.description}</p>
              </article>
            </div>

            <button
              type="button"
              className="hero-card-nav hero-card-nav--next"
              onClick={goNextCard}
              aria-label="Next card"
            >
              &#8250;
            </button>
          </div>
        </div>
      </div>

      {/* CTA кнопка — круглая, лаймовая, верхний правый угол */}
      <a href={ctaLink} className="hero-cta-circle" aria-label={ctaText}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1 17L17 1M17 1H5M17 1V13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>

      {/* Вертикальная навигация — правый край */}
      {verticalLinks.length > 0 && (
        <nav className="hero-vertical-nav" aria-label="Sections">
          {verticalLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
              className="hero-vertical-link"
            >
              {link}
            </a>
          ))}
        </nav>
      )}

      {/* Нижний градиент затемнения */}
      <div className="hero-bottom-fade" aria-hidden="true" />
    </section>
  );
}
