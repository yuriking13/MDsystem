import React from "react";
import OptimizedInteractiveImage from "./OptimizedInteractiveImage";

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
  // Массив интерактивных изображений - рендерятся только в viewport
  const images = [
    { variant: "abstract-1" as const, intensity: 0.5 },
    { variant: "abstract-2" as const, intensity: 0.6 },
    { variant: "geometric" as const, intensity: 0.4 },
    { variant: "organic" as const, intensity: 0.5 },
    { variant: "abstract-3" as const, intensity: 0.7 },
  ];

  return (
    <section className="fullscreen-hero">
      {/* Фоновая галерея интерактивных изображений */}
      <div className="fullscreen-hero-background">
        {images.map((img, i) => (
          <OptimizedInteractiveImage
            key={i}
            variant={img.variant}
            intensity={img.intensity}
            className={`hero-image hero-image-${i + 1}`}
          />
        ))}
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
