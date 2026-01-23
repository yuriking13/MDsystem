/**
 * Утилиты для санитизации и валидации входных данных
 * Дополнительный уровень защиты помимо Zod схем
 */

/**
 * Очищает строку от потенциально опасных символов для логов
 * Предотвращает log injection атаки
 */
export function sanitizeForLog(input: string, maxLength = 200): string {
  if (!input) return '';
  
  return input
    // Удаляем управляющие символы (используем RegExp для избежания lint ошибок)
    .replace(new RegExp('[\x00-\x1F\x7F]', 'g'), '')
    // Удаляем ANSI escape sequences
    .replace(new RegExp('\x1B\\[[0-9;]*[A-Za-z]', 'g'), '')
    // Ограничиваем длину
    .slice(0, maxLength);
}

/**
 * Очищает строку для использования в SQL (дополнительно к параметризации)
 * НЕ заменяет параметризованные запросы!
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (!input) return '';
  
  return input
    // Удаляем NULL байты
    .replace(/\0/g, '')
    // Ограничиваем длину
    .slice(0, maxLength)
    // Trim whitespace
    .trim();
}

/**
 * Валидирует и очищает email
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;
  
  const cleaned = email.toLowerCase().trim();
  
  // Базовая проверка формата
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(cleaned) || cleaned.length > 254) {
    return null;
  }
  
  return cleaned;
}

/**
 * Валидирует UUID
 */
export function isValidUUID(id: string): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Очищает имя файла
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed';
  
  return filename
    // Удаляем path traversal
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    // Удаляем опасные символы (используем RegExp для избежания lint ошибок)
    .replace(new RegExp('[<>:"|?*\x00-\x1F]', 'g'), '')
    // Ограничиваем длину
    .slice(0, 255)
    .trim() || 'unnamed';
}

/**
 * Очищает URL (разрешает только http/https)
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    
    // Разрешаем только http и https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Маскирует чувствительные данные для логов
 */
export function maskSensitive(value: string, visibleChars = 4): string {
  if (!value) return '***';
  if (value.length <= visibleChars * 2) return '***';
  
  return value.slice(0, visibleChars) + '***' + value.slice(-visibleChars);
}

/**
 * Проверяет, содержит ли строка потенциально опасные паттерны
 */
export function containsSuspiciousPatterns(input: string): boolean {
  if (!input) return false;
  
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\b(union|select|insert|update|delete|drop|truncate|exec|execute)\b.*\b(from|into|table|database)\b)/i,
    /('|")\s*(or|and)\s*('|"|\d)/i,
    /;\s*(drop|delete|truncate|insert|update)/i,
    // Script injection
    /<script[\s>]/i,
    /javascript:/i,
    /on\w+\s*=/i,
    // Path traversal
    /\.\.[/\\]/,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Экранирует HTML для безопасного отображения
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  
  return text.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
}
