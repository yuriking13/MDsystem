/**
 * Централизованный логгер для фронтенда
 *
 * В production режиме подавляет debug/info логи
 * Используйте вместо console.log:
 * - logger.info('message', data)
 * - logger.error('message', error)
 * - logger.warn('message', data)
 * - logger.debug('message', data)
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = import.meta.env.PROD;
const currentLevel: LogLevel = isProduction ? "warn" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(
  level: LogLevel,
  context: string | undefined,
  message: string,
): string {
  const prefix = context ? `[${context}]` : "";
  const levelBadge = `[${level.toUpperCase()}]`;
  return `${levelBadge}${prefix} ${message}`;
}

/**
 * Создаёт логгер с контекстом
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => {
      if (!shouldLog("debug")) return;
      if (data !== undefined) {
        globalThis.console.debug(
          formatMessage("debug", context, message),
          data,
        );
      } else {
        globalThis.console.debug(formatMessage("debug", context, message));
      }
    },

    info: (message: string, data?: unknown) => {
      if (!shouldLog("info")) return;
      if (data !== undefined) {
        globalThis.console.info(formatMessage("info", context, message), data);
      } else {
        globalThis.console.info(formatMessage("info", context, message));
      }
    },

    warn: (message: string, data?: unknown) => {
      if (!shouldLog("warn")) return;
      if (data !== undefined) {
        globalThis.console.warn(formatMessage("warn", context, message), data);
      } else {
        globalThis.console.warn(formatMessage("warn", context, message));
      }
    },

    error: (message: string, error?: unknown, data?: unknown) => {
      if (!shouldLog("error")) return;
      if (error !== undefined) {
        globalThis.console.error(
          formatMessage("error", context, message),
          error,
          data,
        );
      } else {
        globalThis.console.error(formatMessage("error", context, message));
      }
    },
  };
}

// Глобальный логгер
export const logger = createLogger("app");

export default logger;
