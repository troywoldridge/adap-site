// src/lib/productAssets.ts
import productAssets from "@/data/productAssets.json";

const byProductId = new Map<number, string>();
(Array.isArray(productAssets) ? productAssets : []).forEach((row: any) => {
  const pid = Number(row?.product_id);
  const cid = String(row?.cloudflare_id ?? "").trim();
  if (Number.isFinite(pid) && pid > 0 && cid) {
    if (!byProductId.has(pid)) byProductId.set(pid, cid);
  }
});

export function cfImageIdForProduct(productId: number): string | null {
  return byProductId.get(productId) ?? null;
}
