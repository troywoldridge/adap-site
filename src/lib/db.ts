// src/lib/db.ts
import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// If you have a schema export, keep it. If not, remove these 2 lines.
// Example: import * as schema from "@/db/schema";
import * as schema from "@/db/schema";

declare global {
  // eslint-disable-next-line no-var
  var __adap_pg_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __adap_drizzle_db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function getDatabaseUrl(): string {
  const url =
    norm(process.env.DATABASE_URL) ||
    norm(process.env.POSTGRES_URL) ||
    norm(process.env.NEON_DATABASE_URL);

  if (!url) {
    // IMPORTANT: throw only when actually used at runtime,
    // not during module import / build-time evaluation.
    throw new Error(
      "DATABASE_URL is required at runtime. Set DATABASE_URL in your environment."
    );
  }

  return url;
}

function getPool(): Pool {
  if (!globalThis.__adap_pg_pool) {
    globalThis.__adap_pg_pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // You can add ssl here if your provider requires it:
      // ssl: { rejectUnauthorized: false },
    });
  }

  return globalThis.__adap_pg_pool;
}

function getDb() {
  if (!globalThis.__adap_drizzle_db) {
    // typed schema drizzle instance
    globalThis.__adap_drizzle_db = drizzle(getPool(), { schema });
  }
  return globalThis.__adap_drizzle_db;
}

// ✅ canonical export used across the app (recommended)
export const db = getDb();

// ✅ backwards-compatible alias for older imports
export const dbClient = db;

// Optional: sometimes you want raw pool access for COPY / transactions
export const pgPool = getPool();
