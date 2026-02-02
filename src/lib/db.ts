// src/lib/db.ts
import "server-only";

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// IMPORTANT: this must point to your Drizzle schema barrel export.
// If your schema index is NOT "@/db/schema", change this import to the correct path.
import * as schema from "@/db/schema";

/**
 * Build/runtime guard:
 * - Next.js may evaluate server modules during `next build` ("Collecting page data").
 * - If DATABASE_URL is missing in the build environment, we must NOT throw at import time,
 *   otherwise the build hard-fails.
 *
 * We only throw when code actually tries to use the DB at runtime.
 */
function getDatabaseUrlOrNull(): string | null {
  const v = process.env.DATABASE_URL;
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function db() {
  if (_db) return _db;

  const connectionString = getDatabaseUrlOrNull();

  // During build (or any env missing DATABASE_URL), do NOT crash just by importing routes.
  // Throw only if something actually tries to use the DB without configuration.
  if (!connectionString) {
    throw new Error("Missing env: DATABASE_URL");
  }

  // Keep a stable Pool so connections are reused.
  if (!_pool) {
    _pool = new pg.Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  _db = drizzle(_pool, { schema });
  return _db;
}

// Optional: expose pool for health checks if you want it
export const pool = {
  get client() {
    if (!_pool) {
      const connectionString = getDatabaseUrlOrNull();
      if (!connectionString) throw new Error("Missing env: DATABASE_URL");
      _pool = new pg.Pool({
        connectionString,
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      });
    }
    return _pool;
  },
};
