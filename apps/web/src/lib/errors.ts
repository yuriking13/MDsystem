/**
 * Утилиты для обработки ошибок в веб-приложении
 * Обеспечивает типобезопасную обработку и парсинг ошибок API
 */

/**
 * Тип ошибки с сообщением
 */
export interface ErrorWithMessage {
  message: string;
}

/**
 * Тип ошибки с кодом (Zod валидация)
 */
export interface ZodValidationError {
  code: string;
  path?: (string | number)[];
  minimum?: number;
  validation?: string;
  message?: string;
}

/**
 * Проверяет, является ли объект ошибкой с сообщением
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

/**
 * Извлекает сообщение ошибки из любого типа
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Неизвестная ошибка";
}

/**
 * Парсит ошибку API в человекочитаемое сообщение
 * Обрабатывает Zod ошибки, HTTP коды и общие ошибки
 */
export function parseApiError(msg: string): string {
  // Пробуем распарсить Zod ошибку валидации
  if (msg.includes('"code"') && msg.includes('"path"')) {
    try {
      const parsed = JSON.parse(msg.replace(/^API \d+:\s*/, ""));
      if (Array.isArray(parsed)) {
        const messages = (parsed as ZodValidationError[]).map((e) => {
          const field = e.path?.[0] || "field";
          if (e.code === "too_small" && e.minimum) {
            return `${field === "password" ? "Пароль" : field}: минимум ${e.minimum} символов`;
          }
          if (e.code === "invalid_string" && e.validation === "email") {
            return "Введите корректный email";
          }
          return e.message || "Ошибка валидации";
        });
        return messages.join(". ");
      }
    } catch {
      // не JSON
    }
  }
  
  // Обрабатываем известные ошибки
  if (msg.includes("Invalid credentials")) {
    return "Неверный email или пароль";
  }
  if (msg.includes("API 401")) {
    return "Неверный email или пароль";
  }
  if (msg.includes("API 403")) {
    return "Недостаточно прав для выполнения операции";
  }
  if (msg.includes("API 404")) {
    return "Запрошенный ресурс не найден";
  }
  if (msg.includes("API 409")) {
    return "Конфликт: ресурс уже существует";
  }
  if (msg.includes("API 500")) {
    return "Ошибка сервера. Попробуйте позже";
  }
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Ошибка сети. Проверьте подключение";
  }
  
  return msg;
}

/**
 * Обертка для безопасного выполнения async функции с обработкой ошибок
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  onError?: (error: string) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const message = parseApiError(getErrorMessage(error));
    onError?.(message);
    return null;
  }
}

/**
 * Хук-подобная функция для обработки ошибки с состоянием
 */
export function handleError(error: unknown): string {
  const msg = getErrorMessage(error);
  return parseApiError(msg);
}
