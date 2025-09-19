// scripts/lib.ts
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false }, // uncomment if your DB requires it
});

export async function db<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params as any[]);
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

export async function withTx<T>(
  fn: (q: (sql: string, p?: unknown[]) => Promise<unknown[]>) => Promise<T>
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const q = (sql: string, p?: unknown[]) => client.query(sql, p as any[]).then(r => r.rows);
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

/* ---------------- HTTP helpers (what your script expects) ---------------- */

type JsonInit = Omit<RequestInit, "body" | "method"> & { headers?: Record<string, string> };

export async function apiGet<T = unknown>(url: string, init: JsonInit = {}): Promise<T> {
  const res = await fetch(url, { method: "GET", headers: { "Accept": "application/json", ...(init.headers ?? {}) }, ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${url} ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<TReq extends object, TRes = unknown>(
  url: string,
  body: TReq,
  init: JsonInit = {}
): Promise<TRes> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    body: JSON.stringify(body),
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${url} ${text}`);
  }
  return res.json() as Promise<TRes>;
}
