import React from "react";

interface FullscreenHeroProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  badge?: string;
}

/**
 * Полноэкранный Hero блок с галереей интерактивных изображений
 * Оптимизирован для минимальной нагрузки на устройство
 */
export default function FullscreenHero({
  title,
  subtitle,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
  badge,
}: FullscreenHeroProps) {
  return (
    <section className="fullscreen-hero">
      {/* Фоновое изображение клетки */}
      <div className="hero-cell-bg">
        <img
          src="https://storage.yandexcloud.net/scentiaiterpublic/landing/1_basic_cell.png"
          alt=""
          className="hero-cell-img"
          loading="eager"
          aria-hidden="true"
        />
      </div>

      {/* Основной контент - центрированный */}
      <div className="fullscreen-hero-content">
        <div className="fullscreen-hero-inner">
          {badge && <span className="hero-badge">{badge}</span>}

          <h1 className="hero-title">{title}</h1>

          <p className="hero-subtitle">{subtitle}</p>

          <div className="hero-actions">
            <a href={ctaLink} className="hero-btn hero-btn-primary">
              {ctaText}
            </a>
            {secondaryCtaText && secondaryCtaLink && (
              <a
                href={secondaryCtaLink}
                className="hero-btn hero-btn-secondary"
              >
                {secondaryCtaText}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Индикатор скролла */}
      <div className="hero-scroll-indicator">
        <div className="scroll-mouse">
          <div className="scroll-wheel"></div>
        </div>
        <span className="scroll-text">Прокрутите вниз</span>
      </div>
    </section>
  );
}
