// scripts/buildAllOptionHashes.sinalite.ts
// Run with:  ts-node scripts/buildAllOptionHashes.sinalite.ts
// or        node --loader ts-node/esm scripts/buildAllOptionHashes.sinalite.ts

import crypto from "crypto";
import fs from "node:fs/promises";

// ─────────────────────────────────────────────────────────────────────────────
// Config — point these at your Sinalite proxy (recommended) or vendor API.
// Example proxy endpoints you might already have:
//   GET /api/vendor/sinalite/products
//   GET /api/vendor/sinalite/products/:id/options
// If you hit Sinalite directly, add their auth header in fetchOpts below.
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE =
  process.env.SINALITE_API_BASE ||
  process.env.PUBLIC_APP_ORIGIN?.replace(/\/$/, "") + "/api/vendor/sinalite";

const EXPECTED_GROUPS = Number(process.env.OPTION_GROUP_COUNT || 6);
const OUTPUT_DIR = process.env.OUTPUT_DIR || "tmp";
const OUTPUT_BASENAME = "option_hashes";

// Optional auth header if you call vendor API directly
const fetchOpts: RequestInit = {
  headers: {
    // 'Authorization': `Bearer ${process.env.SINALITE_API_KEY ?? ''}`,
    "Content-Type": "application/json",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Types (keep minimal + resilient)
// ─────────────────────────────────────────────────────────────────────────────
type Product = { id: number; name?: string | null };
type RawOption = Record<string, unknown>;

// Normalized option used by hashing logic
type Option = {
  group: string;     // e.g., "size", "paper", "color", ...
  optionId: number;  // stable numeric id per choice within the group
};

// Output row (what we’d upsert to DB if we had one)
type OptionHashRow = {
  productId: number;
  optionIds: string;   // comma-separated list, e.g. "12,03,07,11,05,02"
  optionChain: string; // fixed-width zero-padded chain, e.g. "120307110502"
  hash: string;        // md5(optionChain)
  createdAt: string;
  updatedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const pad2 = (n: number): string => n.toString().padStart(2, "0");

function cartesian<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>(
    (acc, group) => acc.flatMap((accRow) => group.map((item) => [...accRow, item])),
    [[]],
  );
}

/**
 * Map whatever the vendor returns into our { group, optionId } shape.
 * Edit this if your proxy uses different field names.
 */
function normalizeOption(raw: RawOption): Option | null {
  // Try multiple likely keys; be generous
  const group =
    (raw.group as string) ??
    (raw.group_name as string) ??
    (raw.groupName as string) ??
    (raw.category as string) ??
    "";

  // Option id keys we commonly see:
  const idLike =
    (raw.optionId as number) ??
    (raw.option_id as number) ??
    (raw.id as number) ??
    (typeof raw.value === "number" ? (raw.value as number) : undefined);

  if (!group || typeof idLike !== "number" || Number.isNaN(idLike)) return null;
  return { group: String(group), optionId: idLike };
}

function groupBy<T, K extends string | number>(items: T[], key: (x: T) => K) {
  const m = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data sources (HTTP instead of DB)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, fetchOpts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${url} ${text}`);
  }
  return res.json() as Promise<T>;
}

async function fetchProducts(): Promise<Product[]> {
  // Adjust this path to your proxy
  const url = `${API_BASE}/products`;
  const data = await fetchJSON<unknown>(url);

  // Try a few shapes: {products: [...]}, or just [...]
  const arr =
    (Array.isArray(data) ? data : (data as Record<string, unknown>)?.products) ??
    [];
  if (!Array.isArray(arr)) return [];

  // Normalize to { id, name? }
  return arr
    .map((p) => {
      const obj = p as Record<string, unknown>;
      const id =
        (obj.id as number) ??
        (obj.productId as number) ??
        (typeof obj["product_id"] === "number" ? (obj["product_id"] as number) : undefined);
      if (typeof id !== "number") return null;
      return { id, name: (obj.name as string) ?? (obj.title as string) ?? null };
    })
    .filter(Boolean) as Product[];
}

async function fetchOptionsForProduct(productId: number): Promise<Option[]> {
  // Adjust this path to your proxy
  const url = `${API_BASE}/products/${productId}/options`;
  const data = await fetchJSON<unknown>(url);

  // Accept both array and wrapped object shapes
  const raw = (Array.isArray(data) ? data : (data as Record<string, unknown>)?.options) ?? [];
  if (!Array.isArray(raw)) return [];

  const normalized = raw
    .map((r) => normalizeOption(r as RawOption))
    .filter(Boolean) as Option[];

  return normalized;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hash generation (in-memory, no DB)
// ─────────────────────────────────────────────────────────────────────────────
async function generateHashesForProduct(productId: number): Promise<OptionHashRow[] | null> {
  const opts = await fetchOptionsForProduct(productId);

  const grouped = groupBy(opts, (o) => o.group);

  if (grouped.size !== EXPECTED_GROUPS) {
    console.warn(
      `⚠️ Skipping product ${productId} — expected ${EXPECTED_GROUPS} option groups, got ${grouped.size}`,
    );
    return null;
  }

  // Stable group order by name
  const groupArrays = [...grouped.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([, arr]) => arr);

  const combos = cartesian(groupArrays);
  const nowISO = new Date().toISOString();

  const rows: OptionHashRow[] = combos.map((combo) => {
    const optionIds = combo.map((opt) => opt.optionId);
    const optionChain = optionIds.map(pad2).join(""); // e.g., 6 groups -> 12 chars
    const hash = crypto.createHash("md5").update(optionChain).digest("hex");

    return {
      productId,
      optionIds: optionIds.join(","),
      optionChain,
      hash,
      createdAt: nowISO,
      updatedAt: nowISO,
    };
  });

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.time("🔧 Total hash generation time");

  // Ensure output dir
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const prods = await fetchProducts();
  console.log(`Found ${prods.length} products from API.`);

  const allRows: OptionHashRow[] = [];

  for (const p of prods) {
    const rows = await generateHashesForProduct(p.id);
    if (rows && rows.length) {
      console.log(`✅ Product ${p.id}${p.name ? ` (${p.name})` : ""}: ${rows.length} combos`);
      allRows.push(...rows);
    }
  }

  // Write one consolidated file (you can also chunk per product if preferred)
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outfile = `${OUTPUT_DIR}/${OUTPUT_BASENAME}-${ts}.json`;
  await fs.writeFile(outfile, JSON.stringify(allRows, null, 2), "utf8");

  console.log(`\n💾 Wrote ${allRows.length} rows → ${outfile}`);
  console.timeEnd("🔧 Total hash generation time");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
