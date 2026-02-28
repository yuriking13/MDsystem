import React, { useRef, useState, useEffect } from "react";

interface OptimizedInteractiveImageProps {
  /** Вариант изображения */
  variant: "abstract-1" | "abstract-2" | "abstract-3" | "geometric" | "organic";
  /** Класс для стилизации */
  className?: string;
  /** Интенсивность интерактивности (0-1) */
  intensity?: number;
}

/**
 * Оптимизированный компонент интерактивного изображения
 * Использует CSS transforms вместо сложных вычислений для максимальной производительности
 * Ленивая инициализация и throttling для минимальной нагрузки
 */
export default function OptimizedInteractiveImage({
  variant,
  className = "",
  intensity = 0.5,
}: OptimizedInteractiveImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>();

  // Intersection Observer для ленивой загрузки
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      { threshold: 0.1 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Throttled mouse tracking - обновляется через requestAnimationFrame
  useEffect(() => {
    if (!isInView) {
      return undefined;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) return; // Пропускаем если предыдущий кадр еще не обработан

      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(1, (e.clientX - rect.left) / rect.width),
        );
        const y = Math.max(
          0,
          Math.min(1, (e.clientY - rect.top) / rect.height),
        );

        setMousePos({ x, y });
        rafRef.current = undefined;
      });
    };

    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    container.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isInView]);

  // Рендер оптимизированного SVG на основе варианта
  const renderOptimizedSVG = () => {
    switch (variant) {
      case "abstract-1":
        return (
          <svg viewBox="0 0 400 400" className="optimized-svg">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#764ba2" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Фоновый слой - не двигается */}
            <circle
              cx="200"
              cy="200"
              r="180"
              fill="url(#grad1)"
              opacity="0.3"
            />

            {/* Средний слой */}
            <g className="parallax-layer-2">
              <circle
                cx="150"
                cy="150"
                r="60"
                fill="url(#grad1)"
                opacity="0.5"
              />
              <circle
                cx="250"
                cy="250"
                r="70"
                fill="url(#grad1)"
                opacity="0.4"
              />
            </g>

            {/* Передний слой - максимальное движение */}
            <g className="parallax-layer-1">
              <circle
                cx="200"
                cy="200"
                r="40"
                fill="url(#grad1)"
                opacity="0.7"
              />
            </g>
          </svg>
        );

      case "abstract-2":
        return (
          <svg viewBox="0 0 400 400" className="optimized-svg">
            <defs>
              <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4facfe" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            <g className="parallax-layer-3">
              <rect
                x="50"
                y="50"
                width="120"
                height="120"
                rx="12"
                fill="url(#grad2)"
                opacity="0.3"
              />
              <rect
                x="230"
                y="230"
                width="120"
                height="120"
                rx="12"
                fill="url(#grad2)"
                opacity="0.3"
              />
            </g>

            <g className="parallax-layer-2">
              <rect
                x="150"
                y="100"
                width="100"
                height="100"
                rx="50"
                fill="url(#grad2)"
                opacity="0.5"
              />
            </g>

            <g className="parallax-layer-1">
              <rect
                x="170"
                y="170"
                width="60"
                height="60"
                rx="8"
                fill="url(#grad2)"
                opacity="0.7"
              />
            </g>
          </svg>
        );

      case "abstract-3":
        return (
          <svg viewBox="0 0 400 400" className="optimized-svg">
            <defs>
              <linearGradient id="grad3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fa709a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fee140" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            <g className="parallax-layer-3">
              <path
                d="M 50 200 Q 100 100 200 150 T 350 200"
                stroke="url(#grad3)"
                strokeWidth="40"
                fill="none"
                opacity="0.3"
              />
            </g>

            <g className="parallax-layer-2">
              <path
                d="M 100 250 Q 200 200 300 250"
                stroke="url(#grad3)"
                strokeWidth="30"
                fill="none"
                opacity="0.5"
              />
            </g>

            <g className="parallax-layer-1">
              <circle
                cx="200"
                cy="200"
                r="30"
                fill="url(#grad3)"
                opacity="0.7"
              />
            </g>
          </svg>
        );

      case "geometric":
        return (
          <svg viewBox="0 0 400 400" className="optimized-svg">
            <defs>
              <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a8edea" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fed6e3" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            <g className="parallax-layer-3">
              <polygon
                points="200,50 350,150 300,300 100,300 50,150"
                fill="url(#grad4)"
                opacity="0.3"
              />
            </g>

            <g className="parallax-layer-2">
              <rect
                x="120"
                y="120"
                width="160"
                height="160"
                fill="url(#grad4)"
                opacity="0.5"
              />
            </g>

            <g className="parallax-layer-1">
              <polygon
                points="200,150 250,200 200,250 150,200"
                fill="url(#grad4)"
                opacity="0.7"
              />
            </g>
          </svg>
        );

      case "organic":
        return (
          <svg viewBox="0 0 400 400" className="optimized-svg">
            <defs>
              <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff9a9e" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#fecfef" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            <g className="parallax-layer-3">
              <ellipse
                cx="200"
                cy="200"
                rx="150"
                ry="120"
                fill="url(#grad5)"
                opacity="0.3"
              />
            </g>

            <g className="parallax-layer-2">
              <ellipse
                cx="180"
                cy="180"
                rx="80"
                ry="100"
                fill="url(#grad5)"
                opacity="0.5"
              />
            </g>

            <g className="parallax-layer-1">
              <ellipse
                cx="220"
                cy="220"
                rx="50"
                ry="40"
                fill="url(#grad5)"
                opacity="0.7"
              />
            </g>
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`optimized-interactive-image ${className} ${isInView ? "is-active" : ""}`}
      data-variant={variant}
    >
      {isInView && renderOptimizedSVG()}
    </div>
  );
}
