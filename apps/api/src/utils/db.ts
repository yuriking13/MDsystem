import type { FastifyInstance } from "fastify";
import type { QueryResult } from "pg";
import { pool } from "../pg.js";

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult>;
};

/**
 * Get a Queryable database interface.
 * Checks if Fastify has a db/pg plugin registered, otherwise
 * falls back to the shared pg pool (from pg.ts) to avoid
 * creating duplicate connection pools.
 */
export function getDb(fastify: FastifyInstance): Queryable {
  const anyF = fastify as any;

  if (anyF.db?.query) return anyF.db as Queryable;
  if (anyF.pg?.query) return anyF.pg as Queryable;
  if (anyF.pg?.pool?.query) return anyF.pg.pool as Queryable;

  // Use the shared pool from pg.ts instead of creating a separate one
  return pool;
}
