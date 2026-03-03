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

const TCELL_IMG =
  "https://storage.yandexcloud.net/scentiaiterpublic/landing/t-cell.png";

/**
 * Полноэкранный Hero блок — минималистичный дизайн
 * с крупным изображением T-клетки справа и текстом слева.
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
      {/* Текстовая часть — слева */}
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

      {/* Изображение T-клетки — справа */}
      <div className="fullscreen-hero-visual">
        <img
          src={TCELL_IMG}
          alt=""
          className="hero-sphere"
          loading="eager"
          draggable={false}
        />
      </div>

      {/* Нижний градиент затемнения для перехода к следующей секции */}
      <div className="hero-bottom-fade" aria-hidden="true" />

      {/* Индикатор скролла */}
      <div className="hero-scroll-indicator">
        <span className="scroll-text">СКРОЛЛИТЕ ВНИЗ</span>
        <span className="scroll-chevron">&#8964;</span>
      </div>
    </section>
  );
}
