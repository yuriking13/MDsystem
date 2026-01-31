/**
 * Утилиты для обработки ошибок в веб-приложении
 */

/**
 * Извлекает сообщение об ошибке из unknown типа
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Неизвестная ошибка";
}

/**
 * Логирует ошибку в консоль с контекстом
 */
export function logError(context: string, error: unknown): void {
  const message = getErrorMessage(error);
  console.error(`[${context}]`, message, error);
}

/**
 * Показывает ошибку пользователю и логирует её
 */
export function handleError(
  context: string,
  error: unknown,
  showAlert = true,
): string {
  const message = getErrorMessage(error);
  logError(context, error);
  if (showAlert) {
    alert(`Ошибка: ${message}`);
  }
  return message;
}

/**
 * Тип guard для проверки что ошибка имеет поле message
 */
export function isErrorWithMessage(
  error: unknown,
): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}
