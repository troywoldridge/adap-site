// scripts/buildSiteData.cjs
const fs = require('fs').promises;
const path = require('path');
const slugify = require('slugify');

async function loadJson(relPath) {
  const file = path.resolve(__dirname, '..', relPath);
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw);
}

async function main() {
  const [catRaw, subRaw, prodRaw, imgRaw] = await Promise.all([
    loadJson('src/data/categoryAssets.json'),
    loadJson('src/data/subcategoryAssets.json'),
    loadJson('src/data/productAssets.json'),
    loadJson('src/data/productImages.json'),
  ]);

  const cats = Array.isArray(catRaw) ? catRaw : Object.values(catRaw);
  const subs = Array.isArray(subRaw) ? subRaw : Object.values(subRaw);
  const prods = Array.isArray(prodRaw) ? prodRaw : Object.values(prodRaw);
  const imgs = Array.isArray(imgRaw) ? imgRaw : Object.values(imgRaw);

  const cfBase = `https://imagedelivery.net/${process.env.CF_ACCOUNT_HASH}`;

  // Build category map
  const catMap = {};
  for (const c of cats) {
    const name = String(c.name);
    const shortName = name.replace(/\s*[Pp]roducts$/, '');
    const slug = slugify(shortName, { lower: true, strict: true });
    const id = Number(c.category_id);
    catMap[id] = {
      id,
      name,
      slug,
      image: c.cloudflare_id ? `${cfBase}/${c.cloudflare_id}/public` : null,
      subcategories: []
    };
  }

  // Build subcategory map
  const subMap = {};
  for (const s of subs) {
    const name = String(s.name);
    const slug = slugify(name, { lower: true, strict: true });
    const id = Number(s.subcategory_id);
    const catId = Number(s.category_id);
    subMap[id] = {
      id,
      name,
      slug,
      image: s.cloudflare_id ? `${cfBase}/${s.cloudflare_id}/public` : null,
      products: []
    };
    if (catMap[catId]) catMap[catId].subcategories.push(subMap[id]);
  }

  // Attach products to subcategories
  for (const p of prods) {
    const id = Number(p.id ?? p.product_id);
    if (!Boolean(Number(p.enabled))) continue;
    const subId = Number(p.subcategory ?? p.subcategory_id);
    const img = imgs.find(i => Number(i.product_id) === id);
    const prodObj = {
      id,
      sku: p.sku || p.matched_sku,
      name: p.name,
      image: img ? `${cfBase}/${img.cloudflare_id}/public` : null
    };
    if (subMap[subId]) subMap[subId].products.push(prodObj);
  }

  // Write out siteData.json
  const siteData = { categories: Object.values(catMap) };
  const out = path.resolve(__dirname, '../src/data/siteData.json');
  await fs.writeFile(out, JSON.stringify(siteData, null, 2), 'utf-8');
  console.log(`✅ siteData.json generated with ${siteData.categories.length} categories`);
}

main().catch(err => {
  console.error('❌ buildSiteData failed:', err);
  process.exit(1);
});
