import React from "react";

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
  slideNumber = "01",
  verticalLinks = [],
}: FullscreenHeroProps) {
  return (
    <section className="fullscreen-hero">
      {/* Сфера — по центру, с наложением */}
      <div className="fullscreen-hero-visual">
        <div className="hero-sphere" aria-hidden="true" />
      </div>

      {/* Watermark — крупная полупрозрачная цифра */}
      <div className="hero-watermark" aria-hidden="true">
        {slideNumber}
      </div>

      {/* Основная Grid-сетка */}
      <div className="hero-grid">
        {/* Левая колонка: заголовок + подзаголовок */}
        <div className="hero-left">
          <h1 className="hero-title">{title}</h1>
          <p className="hero-subtitle">{subtitle}</p>
        </div>

        {/* Правая колонка: описание + read more */}
        <div className="hero-right">
          <p className="hero-description">{description}</p>
          <a href={readMoreLink} className="hero-readmore">
            {readMoreText}
          </a>
        </div>

        {/* Нижняя строка: мета-данные */}
        <div className="hero-bottom-row">
          {/* Пагинация */}
          <div className="hero-pagination">
            <span className="hero-dot hero-dot--active" />
            <span className="hero-dot" />
            <span className="hero-dot" />
            <span className="hero-dot" />
          </div>

          {/* Мета-лево */}
          {metaLeft && (
            <div className="hero-meta hero-meta--left">
              <span className="hero-meta-marker" aria-hidden="true" />
              <span>{metaLeft}</span>
            </div>
          )}

          {/* Мета-центр */}
          {metaCenter && (
            <div className="hero-meta hero-meta--center">
              <span className="hero-meta-marker" aria-hidden="true" />
              <span>{metaCenter}</span>
            </div>
          )}

          {/* Превью следующей секции */}
          {nextSectionTitle && (
            <div className="hero-next-preview">
              <div className="hero-next-number">02</div>
              <div className="hero-next-image" aria-hidden="true" />
              <p className="hero-next-label">{nextSectionTitle}</p>
            </div>
          )}
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
