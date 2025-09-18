// src/lib/cfImageResolver.ts
// Resolves a Cloudflare Image **ID** for a given product by checking your productAssets.json,
// optionally falling back to subcategory/category using Sinalite product meta.

// 🔗 Always refer to Sinalite API documentation for product meta (category/subcategory).

import productAssets from "@/data/productAssets.json";
import { getSinaliteProductMeta } from "@/lib/sinalite.client";

type AssetRow = {
  product_id?: number | string;
  subcategory_id?: number | string;
  category_id?: number | string;
  cloudflare_id?: string | null;
  name?: string | null;
};

const rows: AssetRow[] = Array.isArray(productAssets) ? (productAssets as any[]) : [];

// Index for direct product → CF image id
const productIndex = new Map<number, string>();
for (const r of rows) {
  const pid = Number(r.product_id ?? 0);
  const cid = (r.cloudflare_id ?? "").trim();
  if (Number.isFinite(pid) && pid > 0 && cid && !productIndex.has(pid)) {
    productIndex.set(pid, cid);
  }
}

function pickPreferred(candidateRows: AssetRow[]): string | null {
  const main = candidateRows.find(
    (r) => (r.cloudflare_id ?? "").trim() && /main|hero|primary/i.test(String(r.name ?? "")),
  );
  if (main?.cloudflare_id) return main.cloudflare_id.trim();
  const first = candidateRows.find((r) => (r.cloudflare_id ?? "").trim());
  return first ? first.cloudflare_id!.trim() : null;
}

/** Returns Cloudflare image **ID** (not a URL) or null */
export async function cfImageIdForProductStrict(productId: number): Promise<string | null> {
  if (!Number.isFinite(productId) || productId <= 0) return null;

  // 1) direct product match
  const direct = productIndex.get(productId);
  if (direct) return direct;

  // 2) need meta → subcategory → category fallback
  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(String(productId));
  } catch {
    /* ignore */
  }

  const subIds = [
    Number(meta?.subcategory_id),
    Number(meta?.subCategoryId),
    Number(meta?.subcategoryId),
  ].filter((n) => Number.isFinite(n)) as number[];

  for (const subId of subIds) {
    const matches = rows.filter((r) => Number(r.subcategory_id) === subId);
    const pick = pickPreferred(matches);
    if (pick) return pick;
  }

  const catIds = [Number(meta?.category_id), Number(meta?.categoryId)].filter((n) =>
    Number.isFinite(n),
  ) as number[];

  for (const catId of catIds) {
    const matches = rows.filter((r) => Number(r.category_id) === catId);
    const pick = pickPreferred(matches);
    if (pick) return pick;
  }

  return null;
}
