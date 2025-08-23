// src/lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema"; // ⬅️ import your barrel (must export carts, cartLines, etc.)

declare global {
  // eslint-disable-next-line no-var
  var __adap_pg_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __adap_drizzle: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  throw new Error("Missing env: DATABASE_URL");
}

export const pool = global.__adap_pg_pool ?? new Pool({ connectionString });

// ⬅️ pass { schema } so db.query.* is generated
export const db =
  global.__adap_drizzle ?? drizzle(pool, { schema });

// cache in dev (HMR)
if (!global.__adap_pg_pool) {
  global.__adap_pg_pool = pool;
}
if (!global.__adap_drizzle) {
  global.__adap_drizzle = db;
}
