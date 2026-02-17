import { useState, useEffect } from "react";

/**
 * Форматирование времени в MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Функция для изменения яркости цвета
 */
export function adjustBrightness(color: string, percent: number): string {
  let r: number, g: number, b: number;

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else if (color.startsWith("rgb")) {
    const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      r = parseInt(match[1]);
      g = parseInt(match[2]);
      b = parseInt(match[3]);
    } else {
      return color;
    }
  } else {
    return color;
  }

  const adjust = (c: number) =>
    Math.min(255, Math.max(0, Math.round(c + (c * percent) / 100)));

  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
}

/**
 * Debounce hook для предотвращения частых обновлений
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Цвет уровня графа (использует CSS-переменные)
 */
export function getLevelColor(level: number): string {
  const colors = getGraphNodeColors();
  switch (level) {
    case 0:
      return colors.citing; // Цитирующие статьи
    case 1:
      return colors.candidatePubmed; // Статьи в проекте
    case 2:
      return colors.reference; // References
    case 3:
      return colors.related; // Связанные работы
    default:
      return colors.default;
  }
}

/**
 * Название уровня графа
 */
export function getLevelName(level: number): string {
  switch (level) {
    case 0:
      return "Цитирует статью из базы";
    case 1:
      return "В проекте";
    case 2:
      return "Ссылка (reference)";
    case 3:
      return "Связанная работа";
    default:
      return `Уровень ${level}`;
  }
}

/**
 * Получить значение CSS-переменной
 */
export function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Получить цвета узлов графа из CSS-переменных
 */
export function getGraphNodeColors() {
  return {
    citing: getCSSVariable("--graph-node-citing") || "#0ea5e9",
    selected: getCSSVariable("--graph-node-selected") || "#22c55e",
    excluded: getCSSVariable("--graph-node-excluded") || "#ef4444",
    candidatePubmed:
      getCSSVariable("--graph-node-candidate-pubmed") || "#3b82f6",
    candidateDoaj: getCSSVariable("--graph-node-candidate-doaj") || "#eab308",
    candidateWiley: getCSSVariable("--graph-node-candidate-wiley") || "#8b5cf6",
    reference: getCSSVariable("--graph-node-reference") || "#38bdf8",
    related: getCSSVariable("--graph-node-related") || "#14b8a6",
    aiFound: getCSSVariable("--graph-node-ai-found") || "#22d3ee",
    pvalue: getCSSVariable("--graph-node-pvalue") || "#fbbf24",
    default: getCSSVariable("--graph-node-default") || "#64748b",
    clusterDefault: getCSSVariable("--graph-cluster-default") || "#3b82f6",
  };
}

/**
 * Получить цвета фона графа из CSS-переменных
 */
export function getGraphBackgroundColors() {
  return {
    normal: getCSSVariable("--graph-bg") || "#0b0f19",
    fullscreen: getCSSVariable("--graph-bg-fullscreen") || "#050810",
    linkColor:
      getCSSVariable("--graph-link-color") || "rgba(100, 130, 180, 0.25)",
  };
}

/**
 * Проверить, активна ли светлая тема
 */
export function isLightTheme(): boolean {
  return document.body.classList.contains("light-theme");
}

/**
 * Цвета для кластеров - пастельные версии для светлой темы
 */
export const CLUSTER_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#6366f1", // Indigo
];

/**
 * Пастельные цвета для кластеров (светлая тема)
 */
export const CLUSTER_COLORS_PASTEL = [
  "#93c5fd", // Cool Blue
  "#60a5fa", // Sky Blue
  "#34d399", // Mint Green
  "#fbbf24", // Warm Amber
  "#f87171", // Soft Red
  "#a78bfa", // Soft Violet
  "#38bdf8", // Cyan
  "#2dd4bf", // Teal
  "#f59e0b", // Orange Amber
  "#818cf8", // Indigo
];

/**
 * Получить цвета кластеров в зависимости от темы
 */
export function getClusterColors(): string[] {
  const isLightTheme = document.body.classList.contains("light-theme");
  return isLightTheme ? CLUSTER_COLORS_PASTEL : CLUSTER_COLORS;
}

/**
 * Получить цвет кластера по индексу (с учётом темы)
 */
export function getClusterColor(index: number): string {
  const colors = getClusterColors();
  return colors[index % colors.length];
}

/**
 * Форматирование числа с разделителями тысяч
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("ru-RU");
}

/**
 * Обрезание текста с многоточием
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
