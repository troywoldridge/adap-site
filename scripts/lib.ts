// scripts/lib.ts
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // You may add ssl: { rejectUnauthorized: false } if needed
});

export async function db<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows as T[];
  } finally {
    client.release();
  }
}

// small helper for sane JSON → jsonb writes
export function normalizeMeta(input: unknown): Record<string, unknown> {
  if (input == null) return {};
  if (typeof input === "object" && !Array.isArray(input)) return input as Record<string, unknown>;
  if (Array.isArray(input)) return Object.fromEntries(input.map((v, i) => [String(i), v]));
  if (typeof input === "string") {
    const s = input.trim();
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      try {
        const parsed = JSON.parse(s);
        return typeof parsed === "object" && parsed !== null ? parsed : { value: parsed };
      } catch {
        return { value: s };
      }
    }
    return { value: s };
  }
  return { value: input };
}

export async function withTx<T>(fn: (q: (sql: string, p?: any[]) => Promise<any[]>) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const q = (sql: string, p?: any[]) => client.query(sql, p).then(r => r.rows);
    const out = await fn(q);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
