/**
 * Database Transaction Helpers
 * Обеспечивают атомарность критических операций
 */

import { pool } from "../pg.js";
import type { PoolClient } from "pg";
import { createLogger } from "./logger.js";
import { DatabaseError } from "./typed-errors.js";

const log = createLogger("transactions");

/**
 * Выполнение операции внутри транзакции
 * Автоматически делает COMMIT при успехе и ROLLBACK при ошибке
 * 
 * @example
 * await withTransaction(async (client) => {
 *   await client.query('INSERT INTO users ...');
 *   await client.query('INSERT INTO projects ...');
 * });
 */
export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
  options: {
    isolationLevel?:
      | "READ UNCOMMITTED"
      | "READ COMMITTED"
      | "REPEATABLE READ"
      | "SERIALIZABLE";
    readonly?: boolean;
    deferrable?: boolean;
  } = {},
): Promise<T> {
  const client = await pool.connect();

  try {
    // Начинаем транзакцию с опциями
    let beginQuery = "BEGIN";

    if (options.isolationLevel) {
      beginQuery += ` ISOLATION LEVEL ${options.isolationLevel}`;
    }

    if (options.readonly) {
      beginQuery += " READ ONLY";
    }

    if (options.deferrable) {
      beginQuery += " DEFERRABLE";
    }

    await client.query(beginQuery);

    // Выполняем операцию
    const result = await operation(client);

    // Коммитим
    await client.query("COMMIT");

    return result;
  } catch (error) {
    // Откатываем при ошибке
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      log.error("Failed to rollback transaction", rollbackError as Error);
    }

    // Оборачиваем в DatabaseError для консистентности
    if (error instanceof Error) {
      throw new DatabaseError(
        `Transaction failed: ${error.message}`,
        error,
      );
    }

    throw error;
  } finally {
    // Всегда возвращаем клиент в пул
    client.release();
  }
}

/**
 * Savepoint для вложенных транзакций
 */
export class Savepoint {
  private client: PoolClient;
  private name: string;
  private released = false;

  constructor(client: PoolClient, name: string) {
    this.client = client;
    this.name = name;
  }

  async release(): Promise<void> {
    if (this.released) {
      throw new Error(`Savepoint ${this.name} already released`);
    }
    await this.client.query(`RELEASE SAVEPOINT ${this.name}`);
    this.released = true;
  }

  async rollback(): Promise<void> {
    if (this.released) {
      throw new Error(`Savepoint ${this.name} already released`);
    }
    await this.client.query(`ROLLBACK TO SAVEPOINT ${this.name}`);
  }
}

/**
 * Создание savepoint внутри транзакции
 */
export async function createSavepoint(
  client: PoolClient,
  name: string,
): Promise<Savepoint> {
  await client.query(`SAVEPOINT ${name}`);
  return new Savepoint(client, name);
}

/**
 * Retry логика для serialization failures
 * PostgreSQL может откатить транзакцию при SERIALIZABLE isolation level
 */
export async function withTransactionRetry<T>(
  operation: (client: PoolClient) => Promise<T>,
  options: {
    maxRetries?: number;
    isolationLevel?: "SERIALIZABLE" | "REPEATABLE READ";
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries || 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(operation, {
        isolationLevel: options.isolationLevel || "SERIALIZABLE",
      });
    } catch (error) {
      lastError = error as Error;

      // Проверяем, является ли ошибка serialization failure
      const isSerializationError =
        error instanceof Error &&
        (error.message.includes("could not serialize") ||
          error.message.includes("deadlock detected"));

      if (!isSerializationError || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff перед retry
      const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
      log.warn(
        `Serialization error, retrying (attempt ${attempt}/${maxRetries}) after ${delay}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Transaction failed after retries");
}

/**
 * Batch операции в одной транзакции
 * Удобно для массовых INSERT/UPDATE
 */
export async function batchInTransaction<T, R>(
  items: T[],
  batchSize: number,
  operation: (client: PoolClient, batch: T[]) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];

  await withTransaction(async (client) => {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const result = await operation(client, batch);
      results.push(result);
    }
  });

  return results;
}

/**
 * Advisory lock для координации между процессами
 * Полезно для background jobs
 */
export async function withAdvisoryLock<T>(
  lockId: number,
  operation: () => Promise<T>,
  options: {
    timeout?: number; // ms
    shared?: boolean;
  } = {},
): Promise<T | null> {
  const client = await pool.connect();

  try {
    const lockFunction = options.shared
      ? "pg_try_advisory_lock_shared"
      : "pg_try_advisory_lock";

    // Пытаемся получить lock
    const lockResult = await client.query(
      `SELECT ${lockFunction}($1) as locked`,
      [lockId],
    );

    if (!lockResult.rows[0].locked) {
      log.warn(`Failed to acquire advisory lock ${lockId}`);
      return null;
    }

    try {
      // Выполняем операцию
      return await operation();
    } finally {
      // Освобождаем lock
      const unlockFunction = options.shared
        ? "pg_advisory_unlock_shared"
        : "pg_advisory_unlock";

      await client.query(`SELECT ${unlockFunction}($1)`, [lockId]);
    }
  } finally {
    client.release();
  }
}

/**
 * Генерация lock ID из строки для advisory locks
 */
export function generateLockId(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
