import { useState, useCallback } from 'react';

/**
 * Данные, возвращаемые при завершении операции
 */
export interface ProgressCompleteData {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

/**
 * Опции хука useProgressModal
 */
export interface UseProgressModalOptions {
  title: string;
  endpoint: string;
  onComplete?: (data: ProgressCompleteData) => void;
}

/**
 * Результат хука useProgressModal
 */
export interface UseProgressModalResult {
  show: boolean;
  body: Record<string, unknown> | null;
  start: (requestBody?: Record<string, unknown>) => void;
  close: () => void;
  title: string;
  endpoint: string;
  onComplete: (data: ProgressCompleteData) => void;
}

/**
 * Хук для управления модальным окном прогресса операции
 * 
 * @example
 * ```tsx
 * const progress = useProgressModal({
 *   title: "Поиск статей",
 *   endpoint: "/api/projects/123/search",
 *   onComplete: (data) => {
 *     if (data.success) {
 *       console.log("Найдено статей:", data.data);
 *     }
 *   }
 * });
 * 
 * // Запуск
 * progress.start({ query: "diabetes" });
 * ```
 */
export function useProgressModal(options: UseProgressModalOptions): UseProgressModalResult {
  const [show, setShow] = useState(false);
  const [body, setBody] = useState<Record<string, unknown> | null>(null);

  const start = useCallback((requestBody?: Record<string, unknown>) => {
    setBody(requestBody || {});
    setShow(true);
  }, []);

  const close = useCallback(() => {
    setShow(false);
    setBody(null);
  }, []);

  const handleComplete = useCallback((data: ProgressCompleteData) => {
    if (options.onComplete) {
      options.onComplete(data);
    }
  }, [options]);

  return {
    show,
    body,
    start,
    close,
    title: options.title,
    endpoint: options.endpoint,
    onComplete: handleComplete,
  };
}
