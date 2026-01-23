import pg from 'pg';
import { env } from './env.js';
import { createLogger } from './utils/logger.js';

const { Pool } = pg;
const log = createLogger('pg-pool');

function needsSsl(databaseUrl: string): boolean {
  const u = databaseUrl.toLowerCase();
  return u.includes('sslmode=require') || u.includes('ssl=true');
}

/**
 * Оптимизированный пул соединений PostgreSQL
 * - max: 20 соединений (было 10) - увеличивает параллелизм
 * - min: 2 - держит минимум соединений открытыми
 * - idleTimeoutMillis: 30 сек - освобождает неиспользуемые соединения
 * - connectionTimeoutMillis: 5 сек - таймаут получения соединения
 * - statement_timeout: 30 сек - защита от зависших запросов
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: needsSsl(env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
  max: 20, // Увеличено для лучшего параллелизма
  min: 2,  // Минимум горячих соединений
  idleTimeoutMillis: 30000, // Закрывать idle соединения через 30 сек
  connectionTimeoutMillis: 5000, // Таймаут получения соединения
  allowExitOnIdle: false, // Не закрывать пул при простое
});

// Настройка statement_timeout для защиты от долгих запросов
pool.on('connect', (client) => {
  client.query('SET statement_timeout = 30000'); // 30 секунд
});

// Логирование ошибок пула
pool.on('error', (err) => {
  log.error('Unexpected error on idle client', err);
});

/**
 * Получить статистику пула соединений
 */
export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}
