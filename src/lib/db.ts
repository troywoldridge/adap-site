// src/lib/db.ts
import "server-only";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// ✅ Important: this must be the schema barrel that exports your tables/enums
import * as schema from "@/lib/db/schema";

declare global {
  // eslint-disable-next-line no-var
  var __adapPool: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.NEON_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Provide DATABASE_URL (or NEON_URL/POSTGRES_URL) in the environment."
  );
}

// ✅ Pool singleton (prevents dev hot-reload connection explosions)
export const pool =
  global.__adapPool ??
  new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30_000),
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 10_000),
  });

if (process.env.NODE_ENV !== "production") {
  global.__adapPool = pool;
}

// ✅ Typed Drizzle instance (this is what restores db.query.<tables>)
export const db = drizzle(pool, { schema });

// ---------------------------------------------------------------------------
// Back-compat exports (optional but helps you avoid 100-file edit explosions)
// ---------------------------------------------------------------------------

/** @deprecated Use `import { db } from "@/lib/db"` */
export const dbClient = db;

/** @deprecated Use `import { db } from "@/lib/db"` (db is NOT callable) */
export const getDb = () => db;

export type Db = typeof db;
