// src/lib/db.ts
import "server-only";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "@/lib/db/schema";

type Db = NodePgDatabase<typeof schema> & { $client: Pool };

let _pool: Pool | null = null;
let _db: Db | null = null;

function readDatabaseUrl(): string | null {
  const raw =
    process.env.DATABASE_URL ||
    process.env.NEON_URL ||
    process.env.POSTGRES_URL ||
    null;

  const v = String(raw ?? "").trim();
  return v ? v : null;
}

export function getPool(): Pool {
  if (_pool) return _pool;

  const url = readDatabaseUrl();
  if (!url) {
    // Important: throw only when actually used (not at import time)
    throw new Error(
      "DATABASE_URL is not set. Provide DATABASE_URL (or NEON_URL/POSTGRES_URL) in the environment."
    );
  }

  _pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return _pool;
}

export function getDb(): Db {
  if (_db) return _db;

  const p = getPool();
  _db = drizzle(p, { schema }) as unknown as Db;
  return _db;
}

/**
 * Proxy lets us export a stable `db` object *without* initializing at import time.
 * This prevents Next build / page-data collection from exploding if env injection is misconfigured.
 */
export const db: Db = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = getDb() as unknown as Record<PropertyKey, unknown>;
      return real[prop];
    },
  }
) as unknown as Db;

// Back-compat exports (your codebase expects these in many places)
export const dbClient = db;
export const pool: Pool = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = getPool() as unknown as Record<PropertyKey, unknown>;
      return real[prop];
    },
  }
) as unknown as Pool;
