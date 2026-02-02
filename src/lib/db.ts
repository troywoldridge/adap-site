import "server-only";

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { requireEnv } from "@/lib/env/server";
import * as schema from "@/db/schema";

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getPool(): pg.Pool {
  if (_pool) return _pool;

  const connectionString = requireEnv("DATABASE_URL");
  _pool = new pg.Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return _pool;
}

export function db() {
  if (_db) return _db;
  _db = drizzle(getPool(), { schema });
  return _db;
}

/**
 * Compatibility export:
 * Most files expect `db.select()`, `db.insert()`, `db.query.<table>`, `db.transaction()`, etc.
 */
export const dbClient = db();

/**
 * Optional: used by dev tooling and health checks.
 */
export const pool = getPool();
