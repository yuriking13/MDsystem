/**
 * Typed Error Classes для структурированной обработки ошибок
 * Заменяет generic Error на специфические типы с контекстом
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this);
  }
}

/**
 * Authentication Errors (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required", details?: unknown) {
    super(message, 401, "AUTHENTICATION_ERROR", true, details);
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor(message = "Invalid credentials") {
    super(message);
    this.code = "INVALID_CREDENTIALS";
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor(message = "Token has expired") {
    super(message);
    this.code = "TOKEN_EXPIRED";
  }
}

export class InvalidTokenError extends AuthenticationError {
  constructor(message = "Invalid token") {
    super(message);
    this.code = "INVALID_TOKEN";
  }
}

/**
 * Authorization Errors (403)
 */
export class AuthorizationError extends AppError {
  constructor(message = "Access denied", details?: unknown) {
    super(message, 403, "AUTHORIZATION_ERROR", true, details);
  }
}

export class InsufficientPermissionsError extends AuthorizationError {
  constructor(resource: string) {
    super(`Insufficient permissions to access ${resource}`);
    this.code = "INSUFFICIENT_PERMISSIONS";
  }
}

/**
 * Validation Errors (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", true, details);
  }
}

export class InvalidInputError extends ValidationError {
  constructor(field: string, reason: string) {
    super(`Invalid input for field '${field}': ${reason}`);
    this.code = "INVALID_INPUT";
  }
}

export class MissingRequiredFieldError extends ValidationError {
  constructor(field: string) {
    super(`Missing required field: ${field}`);
    this.code = "MISSING_REQUIRED_FIELD";
  }
}

/**
 * Not Found Errors (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND", true);
  }
}

export class ResourceNotFoundError extends NotFoundError {
  constructor(resource: string, id: string) {
    super(resource, id);
    this.code = "RESOURCE_NOT_FOUND";
  }
}

/**
 * Conflict Errors (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, "CONFLICT", true, details);
  }
}

export class DuplicateResourceError extends ConflictError {
  constructor(resource: string, field: string, value: string) {
    super(`${resource} with ${field}='${value}' already exists`);
    this.code = "DUPLICATE_RESOURCE";
  }
}

/**
 * Rate Limit Errors (429)
 */
export class RateLimitError extends AppError {
  constructor(message = "Too many requests", retryAfter?: number) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", true, { retryAfter });
  }
}

/**
 * Server Errors (500)
 */
export class InternalServerError extends AppError {
  constructor(message = "Internal server error", details?: unknown) {
    super(message, 500, "INTERNAL_SERVER_ERROR", false, details);
  }
}

export class DatabaseError extends InternalServerError {
  constructor(message: string, originalError?: Error) {
    super(message, { originalError: originalError?.message });
    this.code = "DATABASE_ERROR";
  }
}

export class ExternalServiceError extends InternalServerError {
  constructor(service: string, message: string, originalError?: Error) {
    super(`External service '${service}' error: ${message}`, {
      service,
      originalError: originalError?.message,
    });
    this.code = "EXTERNAL_SERVICE_ERROR";
  }
}

/**
 * Service Unavailable (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = "Service temporarily unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE", true);
  }
}

export class CircuitBreakerOpenError extends ServiceUnavailableError {
  constructor(service: string) {
    super(
      `Service '${service}' is temporarily unavailable (circuit breaker open)`,
    );
    this.code = "CIRCUIT_BREAKER_OPEN";
  }
}

/**
 * Type guard для проверки операционных ошибок
 */
export function isOperationalError(error: Error): boolean {
  return error instanceof AppError && error.isOperational;
}

/**
 * Форматирование ошибки для API response
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId?: string;
  };
}

export function formatErrorResponse(
  error: Error,
  requestId?: string,
  includeStack = false,
): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      code: error instanceof AppError ? error.code : "INTERNAL_ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
    },
  };

  if (requestId) {
    response.error.requestId = requestId;
  }

  if (error instanceof AppError && error.details) {
    response.error.details = error.details;
  }

  // В development режиме добавляем stack trace
  if (includeStack && error.stack) {
    response.error.details = {
      ...(typeof response.error.details === "object"
        ? response.error.details
        : {}),
      stack: error.stack.split("\n"),
    };
  }

  return response;
}
