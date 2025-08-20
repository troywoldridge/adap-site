import { apiPost, db } from './lib.js';

async function main() {
  const productId = Number(process.argv[2]);   // e.g. 7557
  const storeCode = Number(process.argv[3]) as 6|9;
  const country   = String(process.argv[4] || 'US');
  const state     = String(process.argv[5] || 'NY');
  const zip       = String(process.argv[6] || '10001');

  if (!productId || ![6,9].includes(storeCode)) {
    console.error('Usage: pnpm cache:ship <productId> <storeCode(6|9)> [country state zip]');
    process.exit(1);
  }

  const options = {
    "Stock": "551",
    "size": "4",
    "qty": "14",
    "Turnaround": "18",
    "Coating / Finish": "647",
    "Shape": "651"
  };

  const payload = {
    items: [{ productId, options }],
    shippingInfo: { ShipState: state, ShipZip: zip, ShipCountry: country }
  };

  const res = await apiPost<any>(`/order/shippingEstimate`, payload);

  await db(`
    INSERT INTO shipping_cache (product_id, store_code, options, ship_country, ship_state, ship_zip, response, cached_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7, now())
    ON CONFLICT (product_id, store_code, options, ship_country, ship_state, ship_zip)
    DO UPDATE SET response=EXCLUDED.response, cached_at=now()
  `, [productId, storeCode, options, country, state, zip, res]);

  console.log(`✅ Cached shipping: product=${productId} store=${storeCode} → ${country}-${state}-${zip}`);
}

main().catch(e => { console.error(e); process.exit(1); });
