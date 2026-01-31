import pg from "pg";
import { env } from "./env.js";
import { createLogger } from "./utils/logger.js";

const { Pool } = pg;
const log = createLogger("pg-pool");

function needsSsl(databaseUrl: string): boolean {
  const u = databaseUrl.toLowerCase();
  return u.includes("sslmode=require") || u.includes("ssl=true");
}

/**
 * Оптимизированный пул соединений PostgreSQL
 * Конфигурация через env переменные:
 * - DB_POOL_SIZE: макс соединений (default: 20)
 * - DB_POOL_MIN: мин соединений (default: 2)
 * - STATEMENT_TIMEOUT_MS: таймаут SQL запросов (default: 30000)
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: needsSsl(env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
  max: env.DB_POOL_SIZE,
  min: env.DB_POOL_MIN,
  idleTimeoutMillis: 30000, // Закрывать idle соединения через 30 сек
  connectionTimeoutMillis: 5000, // Таймаут получения соединения
  allowExitOnIdle: false, // Не закрывать пул при простое
});

// Настройка statement_timeout для защиты от долгих запросов
pool.on("connect", (client) => {
  client.query(`SET statement_timeout = ${env.STATEMENT_TIMEOUT_MS}`);
});

// Логирование ошибок пула
pool.on("error", (err) => {
  log.error("Unexpected error on idle client", err);
});

/**
 * Получить статистику пула соединений
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    config: {
      max: env.DB_POOL_SIZE,
      min: env.DB_POOL_MIN,
      statementTimeout: env.STATEMENT_TIMEOUT_MS,
    },
  };
}
