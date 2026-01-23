/**
 * Централизованная обработка ошибок
 * Заменяет пустые catch блоки на структурированное логирование
 */

import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Создаёт структурированную ошибку приложения
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Предустановленные ошибки
 */
export const Errors = {
  NotFound: (resource = 'Resource') => createError(`${resource} not found`, 404, 'NOT_FOUND'),
  Unauthorized: (message = 'Unauthorized') => createError(message, 401, 'UNAUTHORIZED'),
  Forbidden: (message = 'Access denied') => createError(message, 403, 'FORBIDDEN'),
  BadRequest: (message: string, details?: unknown) => createError(message, 400, 'BAD_REQUEST', details),
  Conflict: (message: string) => createError(message, 409, 'CONFLICT'),
  TooManyRequests: (message = 'Too many requests') => createError(message, 429, 'TOO_MANY_REQUESTS'),
  InternalError: (message = 'Internal server error') => createError(message, 500, 'INTERNAL_ERROR'),
  ServiceUnavailable: (message = 'Service unavailable') => createError(message, 503, 'SERVICE_UNAVAILABLE'),
};

/**
 * Форматирует Zod ошибки в читаемый вид
 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}

/**
 * Глобальный error handler для Fastify
 */
export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Логируем ошибку с контекстом
    const logContext = {
      requestId: request.id,
      method: request.method,
      url: request.url,
      userId: (request as any).user?.sub,
      errorCode: (error as AppError).code || error.code,
      statusCode: (error as AppError).statusCode || error.statusCode || 500,
    };

    // Zod validation errors
    if (error instanceof ZodError) {
      request.log.warn({ ...logContext, validationErrors: error.issues }, 'Validation error');
      return reply.code(400).send({
        error: 'ValidationError',
        message: formatZodError(error),
        details: error.issues,
      });
    }

    // App errors с известным statusCode
    const statusCode = (error as AppError).statusCode || error.statusCode || 500;

    if (statusCode >= 500) {
      // Серверные ошибки - логируем полностью
      request.log.error({ ...logContext, err: error }, 'Server error');
    } else if (statusCode >= 400) {
      // Клиентские ошибки - логируем как warning
      request.log.warn(logContext, error.message);
    }

    // Не раскрываем детали внутренних ошибок в production
    const isProduction = process.env.NODE_ENV === 'production';
    const message = statusCode >= 500 && isProduction
      ? 'Internal server error'
      : error.message;

    return reply.code(statusCode).send({
      error: (error as AppError).code || 'Error',
      message,
      ...(isProduction ? {} : { stack: error.stack }),
    });
  });
}

/**
 * Not found handler
 */
export function setupNotFoundHandler(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    request.log.warn({
      requestId: request.id,
      method: request.method,
      url: request.url,
    }, 'Route not found');

    return reply.code(404).send({
      error: 'NotFound',
      message: `Route ${request.method} ${request.url} not found`,
    });
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
  additionalData?: Record<string, unknown>
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(
    { 
      err, 
      context,
      ...additionalData 
    }, 
    `Error in ${context}: ${err.message}`
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
  }
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
