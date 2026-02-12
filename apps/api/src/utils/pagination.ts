/**
 * Pagination utilities для API endpoints
 * Поддерживает как offset-based, так и cursor-based pagination
 */

import { z } from "zod";

/**
 * Стандартная схема для offset-based pagination
 */
export const OffsetPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type OffsetPaginationParams = z.infer<typeof OffsetPaginationSchema>;

/**
 * Стандартная схема для cursor-based pagination
 */
export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CursorPaginationParams = z.infer<typeof CursorPaginationSchema>;

/**
 * Результат offset pagination
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: Record<string, unknown>;
}

/**
 * Результат cursor pagination
 */
export interface CursorPaginatedResult<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    prevCursor: string | null;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: Record<string, unknown>;
}

/**
 * Вычисление OFFSET для SQL запроса
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Создание объекта пагинации для offset-based
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginatedResult<never>["pagination"] {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Создание cursor из значений полей сортировки
 */
export function encodeCursor(
  values: Record<string, unknown>,
): string {
  return Buffer.from(JSON.stringify(values)).toString("base64url");
}

/**
 * Декодирование cursor
 */
export function decodeCursor(
  cursor: string,
): Record<string, unknown> | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * SQL WHERE clause для cursor-based pagination
 * Пример: для sortBy="created_at", sortOrder="desc", cursor={created_at: "2024-01-01", id: "123"}
 * Генерирует: (created_at < '2024-01-01' OR (created_at = '2024-01-01' AND id < '123'))
 */
export function buildCursorWhereClause(
  cursor: Record<string, unknown> | null,
  sortBy: string,
  sortOrder: "asc" | "desc",
  idField = "id",
): { where: string; values: unknown[] } | null {
  if (!cursor || !cursor[sortBy]) {
    return null;
  }

  const operator = sortOrder === "asc" ? ">" : "<";
  const sortValue = cursor[sortBy];
  const idValue = cursor[idField];

  if (idValue !== undefined) {
    // С учётом tie-breaking по ID
    return {
      where: `(${sortBy} ${operator} $1 OR (${sortBy} = $1 AND ${idField} ${operator} $2))`,
      values: [sortValue, idValue],
    };
  } else {
    // Только по полю сортировки
    return {
      where: `${sortBy} ${operator} $1`,
      values: [sortValue],
    };
  }
}

/**
 * Валидация поля сортировки (whitelist подход для SQL injection защиты)
 */
export function validateSortField(
  sortBy: string | undefined,
  allowedFields: string[],
  defaultField: string,
): string {
  if (!sortBy) {
    return defaultField;
  }

  if (!allowedFields.includes(sortBy)) {
    throw new Error(
      `Invalid sort field: ${sortBy}. Allowed: ${allowedFields.join(", ")}`,
    );
  }

  return sortBy;
}

/**
 * Построение SQL ORDER BY clause
 */
export function buildOrderByClause(
  sortBy: string,
  sortOrder: "asc" | "desc",
  idField = "id",
): string {
  // Всегда добавляем ID для стабильной сортировки (tie-breaking)
  return `${sortBy} ${sortOrder.toUpperCase()}, ${idField} ${sortOrder.toUpperCase()}`;
}

/**
 * Helper для offset pagination с count запросом
 */
export async function paginateQuery<T>(
  queryFn: (offset: number, limit: number) => Promise<T[]>,
  countFn: () => Promise<number>,
  params: OffsetPaginationParams,
): Promise<PaginatedResult<T>> {
  const { page, limit } = params;
  const offset = calculateOffset(page, limit);

  const [data, total] = await Promise.all([
    queryFn(offset, limit),
    countFn(),
  ]);

  return {
    data,
    pagination: createPaginationMeta(page, limit, total),
  };
}

/**
 * Helper для cursor pagination
 */
export async function paginateCursor<T extends Record<string, unknown>>(
  queryFn: (
    cursorWhere: string | null,
    cursorValues: unknown[],
    limit: number,
  ) => Promise<T[]>,
  params: CursorPaginationParams,
  sortBy: string,
  idField = "id",
): Promise<CursorPaginatedResult<T>> {
  const { cursor, limit, sortOrder } = params;

  const decodedCursor = cursor ? decodeCursor(cursor) : null;
  const cursorClause = buildCursorWhereClause(
    decodedCursor,
    sortBy,
    sortOrder,
    idField,
  );

  // Запрашиваем limit + 1 чтобы определить hasNext
  const data = await queryFn(
    cursorClause?.where || null,
    cursorClause?.values || [],
    limit + 1,
  );

  const hasNext = data.length > limit;
  const items = hasNext ? data.slice(0, limit) : data;

  const nextCursor =
    hasNext && items.length > 0
      ? encodeCursor({
          [sortBy]: items[items.length - 1][sortBy],
          [idField]: items[items.length - 1][idField],
        })
      : null;

  const prevCursor =
    items.length > 0
      ? encodeCursor({
          [sortBy]: items[0][sortBy],
          [idField]: items[0][idField],
        })
      : null;

  return {
    data: items,
    pagination: {
      limit,
      nextCursor,
      prevCursor,
      hasNext,
      hasPrev: !!cursor,
    },
  };
}
