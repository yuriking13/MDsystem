import React from "react";
import HeroCellAnimation from "./HeroCellAnimation";

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
 * Полноэкранный Hero блок с анимированной клеточной сценой:
 * здоровая клетка → атака → иммунный ответ → цикл
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
      {/* Анимированная клеточная сцена */}
      <HeroCellAnimation />

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
