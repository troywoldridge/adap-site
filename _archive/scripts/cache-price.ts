// scripts/cache-price.ts
import { apiPost, db } from "./lib";

/** Response shape we actually care about */
type PriceApiResponse = {
  price?: number | string;
  price2?: { price?: number | string } | null;
  // keep the rest flexible
  [k: string]: unknown;
};

type ProductOptions = Record<string, string>;

/** Prefer pointing to your proxy (recommended) */
const API_BASE =
  process.env.SINALITE_PROXY_BASE || // e.g. https://your.app/api/vendor/sinalite
  process.env.PUBLIC_APP_ORIGIN?.replace(/\/$/, "") ||
  "";

/** Extract first numeric price from vendor response */
function toPriceNumber(res: PriceApiResponse): number | null {
  const v =
    res?.price2?.price ??
    res?.price ??
    null;

  if (v == null) return null;
  const n = typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const productId = Number(process.argv[2]); // e.g. 7557
  const storeCode = Number(process.argv[3]) as 6 | 9;

  if (!productId || ![6, 9].includes(storeCode)) {
    console.error("Usage: pnpm cache:price <productId> <storeCode(6|9)>");
    process.exit(1);
  }
  if (!API_BASE) {
    console.error("Missing API base. Set SINALITE_PROXY_BASE or PUBLIC_APP_ORIGIN.");
    process.exit(1);
  }

  // Example payload — adjust IDs to your product
  const options: ProductOptions = {
    Stock: "551",             // 16PT Printed 2 Sides (4/4)
    size: "4",                // 3.5 x 2
    qty: "14",                // 1000
    Turnaround: "18",         // 4 - 5 Business Days
    "Coating / Finish": "647",// Matte Finish
    Shape: "651",             // Rounded Corners
  };

  // Call your proxy endpoint
  const url = `${API_BASE}/price/${productId}/${storeCode}`;

  const res = await apiPost<{ productOptions: ProductOptions }, PriceApiResponse>(
    url,
    { productOptions: options }
  );

  const price = toPriceNumber(res);

  await db(
    `
    INSERT INTO price_cache (product_id, store_code, options, response, price, cached_at)
    VALUES ($1, $2, $3, $4, $5, now())
    ON CONFLICT (product_id, store_code, options)
    DO UPDATE SET
      response = EXCLUDED.response,
      price    = EXCLUDED.price,
      cached_at= now()
  `,
    // If your columns are jsonb, node-postgres will serialize objects fine.
    // If they're text, wrap options/res with JSON.stringify().
    [productId, storeCode, options, res, price]
  );

  console.log(
    `✅ Cached price: product=${productId} store=${storeCode} price=${price ?? "n/a"}`
  );
}

main().catch((e) => {
  console.error("cache-price failed:", e);
  process.exit(1);
});
