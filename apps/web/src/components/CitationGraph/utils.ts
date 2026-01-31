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
 * Цвет уровня графа
 */
export function getLevelColor(level: number): string {
  switch (level) {
    case 0:
      return "#ec4899"; // Розовый для цитирующих
    case 1:
      return "#3b82f6"; // Синий для статей в проекте
    case 2:
      return "#f97316"; // Оранжевый для references
    case 3:
      return "#06b6d4"; // Голубой для связанных работ
    default:
      return "#6b7280";
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
 * Цвета для кластеров
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
 * Получить цвет кластера по индексу
 */
export function getClusterColor(index: number): string {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
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
