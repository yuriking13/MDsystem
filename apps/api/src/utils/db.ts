import type { FastifyInstance } from "fastify";
import { Pool, type QueryResult } from "pg";
import { env } from "../env.js";

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>;
};

type FastifyPgLike = {
  query?: Queryable["query"];
  pool?: Queryable;
};

type FastifyInstanceWithDb = FastifyInstance & {
  db?: Queryable;
  pg?: FastifyPgLike;
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
  const fastifyWithDb = fastify as FastifyInstanceWithDb;

  if (fastifyWithDb.db?.query) return fastifyWithDb.db;
  if (fastifyWithDb.pg?.query) {
    return { query: fastifyWithDb.pg.query };
  }
  if (fastifyWithDb.pg?.pool?.query) return fastifyWithDb.pg.pool;

  return getFallbackPool();
}
