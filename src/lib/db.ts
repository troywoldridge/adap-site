// src/lib/db.ts
import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString,
  // optional: keep it small for serverless-ish builds
  max: 5,
});

export const db = drizzle(pool);

// ✅ Backwards-compat export used all over your codebase
export const dbClient = db;

// Optional helper (if your app expects it)
export function getDb() {
  return db;
}
