import { apiPost, db } from './lib.js';

async function main() {
  const productId = Number(process.argv[2]);   // e.g. 7557
  const storeCode = Number(process.argv[3]) as 6|9;

  if (!productId || ![6,9].includes(storeCode)) {
    console.error('Usage: pnpm cache:price <productId> <storeCode(6|9)>');
    process.exit(1);
  }

  // Example (match the value IDs you saw for 7557/9)
  const options = {
    "Stock": "551",              // 16PT Printed 2 Sides (4/4)
    "size": "4",                 // 3.5 x 2
    "qty": "14",                 // 1000
    "Turnaround": "18",          // 4 - 5 Business Days
    "Coating / Finish": "647",   // Matte Finish
    "Shape": "651"               // Rounded Corners
  };

  const res = await apiPost<any>(`/price/${productId}/${storeCode}`, { productOptions: options });
  const price = Number(res?.price2?.price ?? res?.price ?? 0) || null;

  await db(`
    INSERT INTO price_cache (product_id, store_code, options, response, price, cached_at)
    VALUES ($1,$2,$3,$4,$5, now())
    ON CONFLICT (product_id, store_code, options)
    DO UPDATE SET response=EXCLUDED.response, price=EXCLUDED.price, cached_at=now()
  `, [productId, storeCode, options, res, price]);

  console.log(`✅ Cached price: product=${productId} store=${storeCode} price=${price ?? 'n/a'}`);
}

main().catch(e => { console.error(e); process.exit(1); });
