/**
 * Централизованный логгер для воркеров и фоновых задач
 *
 * Используйте вместо console.log/console.error:
 * - logger.info('message', { data })
 * - logger.error('message', error, { data })
 * - logger.warn('message', { data })
 * - logger.debug('message', { data })
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type ErrorWithCode = Error & {
  code?: unknown;
};

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function extractErrorCode(error: Error): string | undefined {
  const maybeCode = (error as ErrorWithCode).code;
  if (typeof maybeCode === "string") return maybeCode;
  if (typeof maybeCode === "number") return String(maybeCode);
  return undefined;
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    // JSON format для production (легче парсить)
    return JSON.stringify(entry);
  }

  // Человекочитаемый формат для development
  const prefix = entry.context ? `[${entry.context}]` : "";
  const levelBadge = `[${entry.level.toUpperCase()}]`;
  const time = entry.timestamp.split("T")[1]?.slice(0, 12) || entry.timestamp;

  let msg = `${time} ${levelBadge}${prefix} ${entry.message}`;

  if (entry.data && Object.keys(entry.data).length > 0) {
    msg += ` ${JSON.stringify(entry.data)}`;
  }

  if (entry.error) {
    msg += `\n  Error: ${entry.error.message}`;
    if (entry.error.stack && process.env.NODE_ENV !== "production") {
      msg += `\n  Stack: ${entry.error.stack}`;
    }
  }

  return msg;
}

function log(
  level: LogLevel,
  message: string,
  dataOrError?: Record<string, unknown> | Error,
  additionalData?: Record<string, unknown>,
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
  };

  if (dataOrError instanceof Error) {
    entry.error = {
      message: dataOrError.message,
      stack: dataOrError.stack,
      code: extractErrorCode(dataOrError),
    };
    if (additionalData) {
      entry.data = additionalData;
    }
  } else if (dataOrError) {
    entry.data = dataOrError;
  }

  const formatted = formatEntry(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

/**
 * Создаёт логгер с контекстом (например, для воркера)
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => {
      if (!shouldLog("debug")) return;
      const entry: LogEntry = {
        level: "debug",
        timestamp: new Date().toISOString(),
        message,
        context,
        data,
      };
      console.log(formatEntry(entry));
    },

    info: (message: string, data?: Record<string, unknown>) => {
      if (!shouldLog("info")) return;
      const entry: LogEntry = {
        level: "info",
        timestamp: new Date().toISOString(),
        message,
        context,
        data,
      };
      console.log(formatEntry(entry));
    },

    warn: (message: string, data?: Record<string, unknown>) => {
      if (!shouldLog("warn")) return;
      const entry: LogEntry = {
        level: "warn",
        timestamp: new Date().toISOString(),
        message,
        context,
        data,
      };
      console.warn(formatEntry(entry));
    },

    error: (
      message: string,
      error?: Error | unknown,
      data?: Record<string, unknown>,
    ) => {
      if (!shouldLog("error")) return;
      const entry: LogEntry = {
        level: "error",
        timestamp: new Date().toISOString(),
        message,
        context,
        data,
      };
      if (error instanceof Error) {
        entry.error = {
          message: error.message,
          stack: error.stack,
          code: extractErrorCode(error),
        };
      } else if (error) {
        entry.error = { message: String(error) };
      }
      console.error(formatEntry(entry));
    },
  };
}

// Глобальный логгер
export const logger = {
  debug: (message: string, data?: Record<string, unknown>) =>
    log("debug", message, data),
  info: (message: string, data?: Record<string, unknown>) =>
    log("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) =>
    log("warn", message, data),
  error: (
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>,
  ) =>
    log(
      "error",
      message,
      error instanceof Error ? error : undefined,
      error instanceof Error ? data : { ...(data || {}), error: String(error) },
    ),
};

export default logger;
