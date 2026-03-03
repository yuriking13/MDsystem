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
 * Полноэкранный Hero блок — минималистичный дизайн.
 * Круг-плейсхолдер по центру-низу, текст сверху-слева.
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
      {/* Круг-плейсхолдер — по центру-низу */}
      <div className="fullscreen-hero-visual">
        <div className="hero-sphere" aria-hidden="true" />
      </div>

      {/* Текстовая часть — сверху-слева, поверх сферы */}
      <div className="fullscreen-hero-content">
        {badge && <span className="hero-badge">{badge}</span>}

        <h1 className="hero-title">{title}</h1>

        <p className="hero-subtitle">{subtitle}</p>

        <div className="hero-actions">
          <a href={ctaLink} className="hero-btn hero-btn-primary">
            {ctaText}
          </a>
          {secondaryCtaText && secondaryCtaLink && (
            <a href={secondaryCtaLink} className="hero-btn hero-btn-secondary">
              {secondaryCtaText}
            </a>
          )}
        </div>
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
