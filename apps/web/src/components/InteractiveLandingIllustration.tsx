import React, { useEffect, useRef, useState } from "react";

interface InteractiveLandingIllustrationProps {
  variant:
    | "hero"
    | "features"
    | "workflow"
    | "testimonials"
    | "stats"
    | "pricing"
    | "cta";
  className?: string;
}

/**
 * Интерактивный компонент для динамических SVG иллюстраций на лэндинге
 * с эффектом параллакса и плавными анимациями при скролле
 */
export default function InteractiveLandingIllustration({
  variant,
  className = "",
}: InteractiveLandingIllustrationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Отслеживание видимости элемента и прогресса скролла
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    observer.observe(container);

    const handleScroll = () => {
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const elementHeight = rect.height;

      // Вычисляем прогресс от 0 до 1 на основе позиции элемента
      let progress = 0;
      if (rect.top < viewportHeight && rect.bottom > 0) {
        progress =
          1 - (rect.top + elementHeight / 2) / (viewportHeight + elementHeight);
        progress = Math.max(0, Math.min(1, progress));
      }

      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Отслеживание позиции мыши для интерактивных эффектов
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePosition({ x, y });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }

    return undefined;
  }, []);

  // Рендер SVG на основе варианта
  const renderIllustration = () => {
    switch (variant) {
      case "hero":
        return (
          <svg viewBox="0 0 800 600" className="landing-illustration hero-svg">
            <defs>
              <linearGradient
                id="heroGradient1"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
              </linearGradient>
              <linearGradient
                id="heroGradient2"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#f093fb" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#f5576c" stopOpacity="0.5" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Фоновые элементы */}
            <circle
              cx="200"
              cy="150"
              r="80"
              fill="url(#heroGradient1)"
              className="hero-bg-circle-1"
            />
            <circle
              cx="600"
              cy="450"
              r="120"
              fill="url(#heroGradient2)"
              className="hero-bg-circle-2"
            />

            {/* Центральная композиция - документ/dashboard */}
            <g className="hero-center-group">
              {/* Главный прямоугольник - экран */}
              <rect
                x="200"
                y="150"
                width="400"
                height="300"
                rx="12"
                fill="currentColor"
                opacity="0.1"
                stroke="url(#heroGradient1)"
                strokeWidth="2"
                filter="url(#glow)"
              />

              {/* Линии контента */}
              {[0, 1, 2, 3, 4].map((i) => (
                <rect
                  key={i}
                  x="230"
                  y={180 + i * 40}
                  width={300 - i * 20}
                  height="12"
                  rx="6"
                  fill="url(#heroGradient1)"
                  className={`hero-content-line hero-content-line-${i}`}
                  data-index={i}
                />
              ))}

              {/* Иконки сбоку - точки/узлы */}
              {[0, 1, 2].map((i) => (
                <circle
                  key={`icon-${i}`}
                  cx="680"
                  cy={200 + i * 80}
                  r="20"
                  fill="url(#heroGradient2)"
                  className={`hero-icon-circle hero-icon-circle-${i}`}
                  data-index={i}
                />
              ))}
            </g>

            {/* Соединительные линии */}
            <path
              d="M 150 100 Q 400 50 650 150"
              stroke="url(#heroGradient1)"
              strokeWidth="2"
              fill="none"
              className="hero-connect-line-1"
            />
            <path
              d="M 100 500 Q 400 550 700 450"
              stroke="url(#heroGradient2)"
              strokeWidth="2"
              fill="none"
              className="hero-connect-line-2"
            />

            {/* Плавающие частицы */}
            {[...Array(8)].map((_, i) => (
              <circle
                key={`particle-${i}`}
                cx={100 + (i % 4) * 200}
                cy={100 + Math.floor(i / 4) * 400}
                r={3 + i * 0.5}
                fill="url(#heroGradient1)"
                className={`hero-particle hero-particle-${i}`}
                data-index={i}
              />
            ))}
          </svg>
        );

      case "features":
        return (
          <svg
            viewBox="0 0 800 600"
            className="landing-illustration features-svg"
          >
            <defs>
              <linearGradient
                id="featGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#4facfe" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Сетка узлов */}
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((col) => {
                const x = 200 + col * 200;
                const y = 150 + row * 150;
                const delay = (row + col) * 0.15;
                const active = scrollProgress > delay;

                return (
                  <g key={`node-${row}-${col}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r={active ? 40 : 10}
                      fill="url(#featGradient)"
                      className={`features-node ${active ? "features-node-active" : ""}`}
                    />
                    {/* Соединительные линии */}
                    {col < 2 && (
                      <line
                        x1={x}
                        y1={y}
                        x2={x + 200}
                        y2={y}
                        stroke="url(#featGradient)"
                        strokeWidth="2"
                        className={`features-line ${active ? "features-line-active" : ""}`}
                      />
                    )}
                    {row < 2 && (
                      <line
                        x1={x}
                        y1={y}
                        x2={x}
                        y2={y + 150}
                        stroke="url(#featGradient)"
                        strokeWidth="2"
                        className={`features-line ${active ? "features-line-active" : ""}`}
                      />
                    )}
                  </g>
                );
              }),
            )}
          </svg>
        );

      case "workflow":
        return (
          <svg
            viewBox="0 0 800 600"
            className="landing-illustration workflow-svg"
          >
            <defs>
              <linearGradient
                id="workflowGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#fa709a" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fee140" stopOpacity="0.6" />
              </linearGradient>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="url(#workflowGradient)"
                />
              </marker>
            </defs>

            {/* Процессный флоу */}
            {[0, 1, 2, 3].map((i) => {
              const x = 100 + i * 170;
              const progress = Math.max(0, Math.min(1, scrollProgress * 4 - i));

              return (
                <g key={`step-${i}`}>
                  <rect
                    x={x}
                    y="250"
                    width="120"
                    height="100"
                    rx="8"
                    fill="url(#workflowGradient)"
                    className={`workflow-step ${progress > 0 ? "workflow-step-active" : ""}`}
                    data-index={i}
                  />
                  {/* Стрелка */}
                  {i < 3 && (
                    <path
                      d={`M ${x + 120} 300 L ${x + 170} 300`}
                      stroke="url(#workflowGradient)"
                      strokeWidth="3"
                      markerEnd="url(#arrowhead)"
                      className={`workflow-arrow ${progress > 0 ? "workflow-arrow-active" : ""}`}
                      data-index={i}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        );

      case "stats":
        return (
          <svg viewBox="0 0 800 600" className="landing-illustration stats-svg">
            <defs>
              <linearGradient
                id="statsGradient"
                x1="0%"
                y1="100%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#30cfd0" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#330867" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Анимированная диаграмма */}
            {[0, 1, 2, 3, 4].map((i) => {
              const height = 100 + i * 40;
              const barProgress = Math.max(
                0,
                Math.min(1, scrollProgress * 2 - i * 0.2),
              );

              return (
                <rect
                  key={`bar-${i}`}
                  x={150 + i * 120}
                  y={500 - height * barProgress}
                  width="80"
                  height={height * barProgress}
                  rx="4"
                  fill="url(#statsGradient)"
                  className="stats-bar"
                  data-index={i}
                />
              );
            })}

            {/* Соединительная кривая */}
            <path
              d="M 190 400 Q 310 360 430 320 Q 550 280 670 240"
              stroke="url(#statsGradient)"
              strokeWidth="3"
              fill="none"
              className="stats-curve"
            />
          </svg>
        );

      case "pricing":
        return (
          <svg
            viewBox="0 0 800 600"
            className="landing-illustration pricing-svg"
          >
            <defs>
              <linearGradient
                id="pricingGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#a8edea" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fed6e3" stopOpacity="0.6" />
              </linearGradient>
              <radialGradient id="pricingRadial">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#a8edea" stopOpacity="0.2" />
              </radialGradient>
            </defs>

            {/* Три карточки цен */}
            {[0, 1, 2].map((i) => {
              const x = 150 + i * 220;
              const delay = i * 0.2;
              const cardProgress = Math.max(
                0,
                Math.min(1, (scrollProgress - delay) * 2),
              );

              return (
                <g
                  key={`price-card-${i}`}
                  className={`pricing-card ${i === 1 ? "pricing-card-featured" : ""} ${cardProgress > 0 ? "pricing-card-active" : ""}`}
                  transform={`translate(${x}, 300)`}
                  data-index={i}
                >
                  <rect
                    x="0"
                    y="0"
                    width="160"
                    height="280"
                    rx="12"
                    fill={
                      i === 1 ? "url(#pricingGradient)" : "url(#pricingRadial)"
                    }
                    opacity="0.6"
                    stroke="url(#pricingGradient)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="30"
                    fill="url(#pricingGradient)"
                    opacity="0.8"
                    className={`pricing-icon pricing-icon-${i}`}
                  />
                </g>
              );
            })}

            {/* Декоративные элементы */}
            <circle
              cx="400"
              cy="100"
              r="50"
              fill="url(#pricingRadial)"
              className="pricing-decoration"
            />
          </svg>
        );

      case "cta":
      case "testimonials":
      default:
        return (
          <svg viewBox="0 0 800 600" className="landing-illustration cta-svg">
            <defs>
              <linearGradient
                id="ctaGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#ff9a9e" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#fecfef" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ffecd2" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Концентрические круги */}
            {[0, 1, 2, 3, 4].map((i) => (
              <circle
                key={`ring-${i}`}
                cx="400"
                cy="300"
                r={50 + i * 60}
                fill="none"
                stroke="url(#ctaGradient)"
                strokeWidth="2"
                strokeDasharray={`${10 + i * 5} ${20 + i * 5}`}
                className={`cta-ring cta-ring-${i}`}
                data-index={i}
              />
            ))}

            {/* Центральная звезда */}
            <polygon
              points="400,250 420,290 460,290 430,315 440,355 400,330 360,355 370,315 340,290 380,290"
              fill="url(#ctaGradient)"
              className="cta-star"
            />
          </svg>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`interactive-landing-illustration ${className} ${isVisible ? "is-visible" : ""}`}
      data-variant={variant}
    >
      {renderIllustration()}
    </div>
  );
}
