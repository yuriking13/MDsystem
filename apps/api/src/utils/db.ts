import type { FastifyInstance } from "fastify";
import { Pool, type QueryResult } from "pg";
import { env } from "../env.js";

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>;
};

let fallbackPool: Pool | null = null;

function needsSsl(databaseUrl: string): boolean {
  const u = databaseUrl.toLowerCase();
  return u.includes("sslmode=require") || u.includes("ssl=true");
}

function getFallbackPool(): Pool {
  if (fallbackPool) return fallbackPool;

  fallbackPool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: needsSsl(env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });

  return fallbackPool;
}

export function getDb(fastify: FastifyInstance): Queryable {
  const anyF = fastify as any;

  if (anyF.db?.query) return anyF.db as Queryable;
  if (anyF.pg?.query) return anyF.pg as Queryable;
  if (anyF.pg?.pool?.query) return anyF.pg.pool as Queryable;

  return getFallbackPool();
}
