import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

function needsSsl(databaseUrl: string): boolean {
  const u = databaseUrl.toLowerCase();
  return u.includes('sslmode=require') || u.includes('ssl=true');
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: needsSsl(env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
  max: 10,
});
