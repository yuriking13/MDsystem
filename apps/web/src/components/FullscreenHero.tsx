import React, { useState, useEffect, useCallback } from "react";

const HERO_IMAGES = [
  "https://storage.yandexcloud.net/scentiaiterpublic/landing/1_basic_cell.png",
  "https://storage.yandexcloud.net/scentiaiterpublic/landing/2_virus_cell.png",
  "https://storage.yandexcloud.net/scentiaiterpublic/landing/3_attacked_cell.png",
] as const;

/** Тайминги (мс) */
const PHASE_SHOW = 4000; // показ текущего кадра
const PHASE_FADE = 2000; // плавное появление следующего (1→2)
const PHASE_GLITCH = 1200; // длительность глитч-эффекта (2→3)

type Phase = "show" | "fade" | "glitch";

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
 * Полноэкранный Hero блок с анимированной сменой изображений
 * 1_basic_cell → fade → 2_virus_cell → glitch → 3_attacked_cell → fade → …
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
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("show");

  const advance = useCallback(() => {
    const nextIdx = (currentIdx + 1) % HERO_IMAGES.length;
    // Переход 1→2: fade, переход 2→3: glitch, переход 3→1: fade
    const transitionType: Phase = currentIdx === 1 ? "glitch" : "fade";

    setPhase(transitionType);

    const duration = transitionType === "glitch" ? PHASE_GLITCH : PHASE_FADE;

    setTimeout(() => {
      setCurrentIdx(nextIdx);
      setPhase("show");
    }, duration);
  }, [currentIdx]);

  useEffect(() => {
    const timer = setTimeout(advance, PHASE_SHOW);
    return () => clearTimeout(timer);
  }, [currentIdx, phase, advance]);

  // Предзагрузка всех изображений
  useEffect(() => {
    HERO_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const nextIdx = (currentIdx + 1) % HERO_IMAGES.length;

  return (
    <section className="fullscreen-hero">
      {/* Слой текущего изображения */}
      <div className="hero-cell-bg">
        <img
          src={HERO_IMAGES[currentIdx]}
          alt=""
          className="hero-cell-img"
          loading="eager"
          aria-hidden="true"
        />
      </div>

      {/* Слой следующего изображения (fade / glitch) */}
      {phase !== "show" && (
        <div
          className={`hero-cell-bg hero-cell-overlay ${
            phase === "glitch" ? "hero-glitch-in" : "hero-fade-in"
          }`}
        >
          <img
            src={HERO_IMAGES[nextIdx]}
            alt=""
            className="hero-cell-img"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Глитч-артефакты */}
      {phase === "glitch" && (
        <div className="hero-glitch-overlay" aria-hidden="true">
          <div className="glitch-line glitch-line-1" />
          <div className="glitch-line glitch-line-2" />
          <div className="glitch-line glitch-line-3" />
          <div className="glitch-line glitch-line-4" />
          <div className="glitch-line glitch-line-5" />
        </div>
      )}

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
