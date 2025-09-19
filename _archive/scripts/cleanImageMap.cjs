// scripts/cleanImageMap.cjs
const fs = require('fs');
const path = require('path');

function toInt(val) {
  if (typeof val === 'string') {
    const num = Number(val);
    if (!Number.isNaN(num)) {
      return Math.trunc(num);
    }
  }
  return null;
}

async function main() {
  const inPath  = path.resolve(__dirname, '../src/data/imageMap.json');
  const outPath = path.resolve(__dirname, '../src/data/imageMap.clean.json');

  const raw = fs.readFileSync(inPath, 'utf-8');
  const arr = JSON.parse(raw);

  const cleaned = arr.map(item => ({
    category_id:    toInt(item.category_id),
    subcategory_id: toInt(item.subcategory_id),
    name:           item.name || null,
    image_name:     item.image_name || null,
    cloudflare_id:  item.cloudflare_id || null,
    product_id:     toInt(item.product_id),
    matched_sku:    item.matched_sku || null
  }));

  fs.writeFileSync(outPath, JSON.stringify(cleaned, null, 2), 'utf-8');
  console.log(`✅ Wrote ${cleaned.length} records to ${outPath}`);
}

main().catch(err => {
  console.error('❌ Error cleaning imageMap:', err);
  process.exit(1);
});
