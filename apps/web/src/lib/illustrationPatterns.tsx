/**
 * Библиотека паттернов и градиентов для динамических иллюстраций
 */

export interface GradientConfig {
  id: string;
  type: "linear" | "radial";
  colors: Array<{
    offset: string;
    color: string;
    opacity?: number;
  }>;
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
}

/**
 * Коллекция красивых градиентов для иллюстраций
 */
export const ILLUSTRATION_GRADIENTS: Record<string, GradientConfig> = {
  sunset: {
    id: "sunset",
    type: "linear",
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "100%",
    colors: [
      { offset: "0%", color: "#ff6b6b", opacity: 0.8 },
      { offset: "50%", color: "#feca57", opacity: 0.7 },
      { offset: "100%", color: "#ee5a6f", opacity: 0.6 },
    ],
  },
  ocean: {
    id: "ocean",
    type: "linear",
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "100%",
    colors: [
      { offset: "0%", color: "#4facfe", opacity: 0.8 },
      { offset: "100%", color: "#00f2fe", opacity: 0.6 },
    ],
  },
  purple: {
    id: "purple",
    type: "linear",
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "100%",
    colors: [
      { offset: "0%", color: "#667eea", opacity: 0.8 },
      { offset: "100%", color: "#764ba2", opacity: 0.6 },
    ],
  },
  peach: {
    id: "peach",
    type: "linear",
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "100%",
    colors: [
      { offset: "0%", color: "#fa709a", opacity: 0.8 },
      { offset: "100%", color: "#fee140", opacity: 0.6 },
    ],
  },
  mint: {
    id: "mint",
    type: "linear",
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "100%",
    colors: [
      { offset: "0%", color: "#a8edea", opacity: 0.8 },
      { offset: "100%", color: "#fed6e3", opacity: 0.6 },
    ],
  },
  aurora: {
    id: "aurora",
    type: "linear",
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "100%",
    colors: [
      { offset: "0%", color: "#ff9a9e", opacity: 0.8 },
      { offset: "50%", color: "#fecfef", opacity: 0.6 },
      { offset: "100%", color: "#ffecd2", opacity: 0.8 },
    ],
  },
  cosmic: {
    id: "cosmic",
    type: "radial",
    colors: [
      { offset: "0%", color: "#667eea", opacity: 0.8 },
      { offset: "50%", color: "#764ba2", opacity: 0.5 },
      { offset: "100%", color: "#f093fb", opacity: 0.3 },
    ],
  },
};

/**
 * Компонент для рендера SVG градиентов
 */
export function renderGradientDefs(gradients: GradientConfig[]) {
  return (
    <defs>
      {gradients.map((gradient) => {
        if (gradient.type === "linear") {
          return (
            <linearGradient
              key={gradient.id}
              id={gradient.id}
              x1={gradient.x1}
              y1={gradient.y1}
              x2={gradient.x2}
              y2={gradient.y2}
            >
              {gradient.colors.map((color, i) => (
                <stop
                  key={i}
                  offset={color.offset}
                  stopColor={color.color}
                  stopOpacity={color.opacity ?? 1}
                />
              ))}
            </linearGradient>
          );
        } else {
          return (
            <radialGradient key={gradient.id} id={gradient.id}>
              {gradient.colors.map((color, i) => (
                <stop
                  key={i}
                  offset={color.offset}
                  stopColor={color.color}
                  stopOpacity={color.opacity ?? 1}
                />
              ))}
            </radialGradient>
          );
        }
      })}

      {/* Общие фильтры */}
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="blur">
        <feGaussianBlur stdDeviation="2" />
      </filter>

      <filter id="shadow">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
      </filter>
    </defs>
  );
}

/**
 * Паттерны фоновых элементов
 */
export interface PatternElement {
  type: "circle" | "rect" | "path" | "polygon";
  props: Record<string, unknown>;
  animate?: {
    attribute: string;
    from: string | number;
    to: string | number;
    duration: string;
    repeatCount?: string;
  };
}

/**
 * Генератор плавающих частиц
 */
export function generateFloatingParticles(
  count: number,
  bounds: { width: number; height: number },
  scrollProgress: number = 0,
): PatternElement[] {
  const particles: PatternElement[] = [];

  for (let i = 0; i < count; i++) {
    const baseX =
      (bounds.width / count) * i + Math.random() * (bounds.width / count);
    const baseY = Math.random() * bounds.height;
    const radius = 2 + Math.random() * 4;

    const offsetX = Math.sin(scrollProgress * Math.PI + i) * 30;
    const offsetY = Math.cos(scrollProgress * Math.PI + i) * 30;

    particles.push({
      type: "circle",
      props: {
        cx: baseX + offsetX,
        cy: baseY + offsetY,
        r: radius,
        opacity: 0.2 + Math.sin(scrollProgress * Math.PI * 2 + i) * 0.3,
      },
    });
  }

  return particles;
}

/**
 * Генератор сетки точек
 */
export function generateDotGrid(
  rows: number,
  cols: number,
  spacing: number,
  startX: number = 0,
  startY: number = 0,
): PatternElement[] {
  const dots: PatternElement[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      dots.push({
        type: "circle",
        props: {
          cx: startX + col * spacing,
          cy: startY + row * spacing,
          r: 2,
          opacity: 0.3,
        },
      });
    }
  }

  return dots;
}

/**
 * Генератор волн
 */
export function generateWave(
  amplitude: number,
  frequency: number,
  phase: number,
  width: number,
  startY: number,
  points: number = 50,
): string {
  const step = width / points;
  let path = `M 0 ${startY}`;

  for (let i = 0; i <= points; i++) {
    const x = i * step;
    const y =
      startY +
      Math.sin((x / width) * frequency * Math.PI * 2 + phase) * amplitude;
    path += ` L ${x} ${y}`;
  }

  return path;
}

/**
 * Генератор органических форм (blob)
 */
export function generateBlob(
  centerX: number,
  centerY: number,
  radius: number,
  irregularity: number = 0.3,
  points: number = 8,
): string {
  const angleStep = (Math.PI * 2) / points;
  let path = "";

  const controlPoints: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= points; i++) {
    const angle = i * angleStep;
    const randomRadius = radius * (1 + (Math.random() - 0.5) * irregularity);
    const x = centerX + Math.cos(angle) * randomRadius;
    const y = centerY + Math.sin(angle) * randomRadius;
    controlPoints.push({ x, y });
  }

  // Создаём smooth path с кривыми Безье
  path = `M ${controlPoints[0].x} ${controlPoints[0].y}`;

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const current = controlPoints[i];
    const next = controlPoints[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;

    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  path += " Z";
  return path;
}

/**
 * Анимированная геометрическая композиция
 */
export function createGeometricComposition(
  scrollProgress: number,
  mouseX: number = 0.5,
  mouseY: number = 0.5,
) {
  const parallaxX = (mouseX - 0.5) * 40;
  const parallaxY = (mouseY - 0.5) * 40;

  return {
    transform: {
      parallax: `translate(${parallaxX}px, ${parallaxY}px)`,
      rotate: `rotate(${scrollProgress * 180}deg)`,
      scale: `scale(${0.8 + scrollProgress * 0.4})`,
    },
    opacity: Math.min(1, scrollProgress * 1.5),
  };
}

/**
 * Цветовая схема для тематического оформления
 */
export const COLOR_SCHEMES = {
  tech: ["#667eea", "#764ba2", "#f093fb"],
  nature: ["#56ab2f", "#a8e063", "#86f7c3"],
  fire: ["#ff6b6b", "#feca57", "#ee5a6f"],
  ice: ["#4facfe", "#00f2fe", "#a8edea"],
  sunset: ["#fa709a", "#fee140", "#ff9a9e"],
  cosmic: ["#667eea", "#764ba2", "#f093fb", "#fecfef"],
};

/**
 * Утилита для интерполяции значений
 */
export function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

/**
 * Утилита для easing функций
 */
export const easing = {
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOut: (t: number) => t * (2 - t),
  easeIn: (t: number) => t * t,
  elasticOut: (t: number) => {
    const p = 0.3;
    return (
      Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1
    );
  },
  bounceOut: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
};
