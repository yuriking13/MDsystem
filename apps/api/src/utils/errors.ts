/**
 * Централизованная обработка ошибок
 * Заменяет пустые catch блоки на структурированное логирование
 */

import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import {
  AppError as TypedAppError,
  formatErrorResponse,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
} from "./typed-errors.js";

// Re-export typed errors для обратной совместимости
export { TypedAppError as AppError };

/**
 * Предустановленные ошибки (legacy, для обратной совместимости)
 */
export const Errors = {
  NotFound: (resource = "Resource") => new NotFoundError(resource),
  Unauthorized: (message = "Unauthorized") => new AuthenticationError(message),
  Forbidden: (message = "Access denied") => new AuthorizationError(message),
  BadRequest: (message: string, details?: unknown) =>
    new ValidationError(message, details),
  Conflict: (message: string) => new ConflictError(message),
  TooManyRequests: (message = "Too many requests") =>
    new RateLimitError(message),
  InternalError: (message = "Internal server error") =>
    new InternalServerError(message),
  ServiceUnavailable: (message = "Service unavailable") =>
    new ServiceUnavailableError(message),
};

/**
 * Форматирует Zod ошибки в читаемый вид
 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

/**
 * Глобальный error handler для Fastify
 */
export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      const requestWithUser = request as FastifyRequest & {
        user?: { sub?: string };
      };
      // Логируем ошибку с контекстом
      const logContext = {
        requestId: request.id,
        method: request.method,
        url: request.url,
        userId: requestWithUser.user?.sub,
        errorCode:
          error instanceof TypedAppError ? error.code : error.code || "UNKNOWN",
        statusCode:
          error instanceof TypedAppError
            ? error.statusCode
            : error.statusCode || 500,
      };

      // Zod validation errors
      if (error instanceof ZodError) {
        request.log.warn(
          { ...logContext, validationErrors: error.issues },
          "Validation error",
        );

        const validationError = new ValidationError(
          formatZodError(error),
          error.issues,
        );

        const response = formatErrorResponse(
          validationError,
          request.id,
          process.env.NODE_ENV !== "production",
        );

        return reply.code(400).send(response);
      }

      // Typed App errors
      if (error instanceof TypedAppError) {
        if (error.statusCode >= 500) {
          // Серверные ошибки - логируем полностью
          request.log.error({ ...logContext, err: error }, "Server error");
        } else if (error.statusCode >= 400) {
          // Клиентские ошибки - логируем как warning
          request.log.warn(logContext, error.message);
        }

        // Используем formatErrorResponse для единообразного формата
        const response = formatErrorResponse(
          error,
          request.id,
          process.env.NODE_ENV !== "production",
        );

        return reply.code(error.statusCode).send(response);
      }

      // Fastify ошибки и прочие
      const statusCode = error.statusCode || 500;

      if (statusCode >= 500) {
        request.log.error({ ...logContext, err: error }, "Server error");
      } else if (statusCode >= 400) {
        request.log.warn(logContext, error.message);
      }

      // Для неизвестных ошибок создаём InternalServerError
      const wrappedError =
        statusCode >= 500 ? new InternalServerError(error.message) : error;

      const response = formatErrorResponse(
        wrappedError instanceof Error
          ? wrappedError
          : new Error(String(wrappedError)),
        request.id,
        process.env.NODE_ENV !== "production",
      );

      return reply.code(statusCode).send(response);
    },
  );
}

/**
 * Not found handler
 */
export function setupNotFoundHandler(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    request.log.warn(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
      },
      "Route not found",
    );

    const notFoundError = new NotFoundError(
      `Route ${request.method} ${request.url}`,
    );
    const response = formatErrorResponse(notFoundError, request.id);

    return reply.code(404).send(response);
  });
}

/**
 * Безопасная обработка ошибок в async коде
 * Использовать вместо пустых catch блоков
 */
export function logError(
  logger: { error: (obj: object, msg: string) => void },
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(
    {
      err,
      context,
      ...additionalData,
    },
    `Error in ${context}: ${err.message}`,
  );
}

/**
 * Wrapper для async операций с логированием ошибок
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  options: {
    logger: { error: (obj: object, msg: string) => void };
    context: string;
    fallback?: T;
    rethrow?: boolean;
  },
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    logError(options.logger, options.context, error);
    if (options.rethrow) {
      throw error;
    }
    return options.fallback;
  }
}
