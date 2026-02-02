// src/lib/db.ts
import "server-only";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// IMPORTANT: your schema type in the build error points at: src/db/schema/index
// So we import the schema barrel from "@/db/schema" (which should resolve to src/db/schema/index.ts)
import * as schema from "@/db/schema";

type Schema = typeof schema;

declare global {
  // eslint-disable-next-line no-var
  var __adap_pg_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __adap_drizzle_db:
    | (NodePgDatabase<Schema> & { $client: Pool })
    | undefined;
}

function getDatabaseUrl() {
  const url =
    process.env.DATABASE_URL ||
    process.env.NEON_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    "";

  if (!url) {
    throw new Error(
      "Missing DATABASE_URL (or NEON_URL / POSTGRES_URL). Set it in your deployment environment."
    );
  }

  return url;
}

// Reuse singletons across hot reloads / multiple imports
export const pool: Pool =
  globalThis.__adap_pg_pool ??
  new Pool({
    connectionString: getDatabaseUrl(),
    // Most hosted Postgres providers require SSL in production
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 10000),
  });

if (!globalThis.__adap_pg_pool) globalThis.__adap_pg_pool = pool;

export const db:
  | (NodePgDatabase<Schema> & { $client: Pool })
  | (NodePgDatabase<Schema> & { $client: Pool }) =
  globalThis.__adap_drizzle_db ??
  (drizzle(pool, { schema }) as NodePgDatabase<Schema> & { $client: Pool });

if (!globalThis.__adap_drizzle_db) globalThis.__adap_drizzle_db = db;

/**
 * Some parts of the app call getDb() (like invoice/email/shared.ts).
 * This MUST be callable (a function), not an object alias.
 */
export function getDb() {
  return db;
}
