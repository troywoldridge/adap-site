// scripts/sync-sinalite-products.ts

import { db } from '@/lib/db';
import { products, categories, subcategories } from '@/lib/migrations/schema';
import { listProducts, getProductDetails } from '@/lib/sinalite/products';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function syncSinaliteProducts() {
  console.log('🧹 Wiping all products...');
  await db.delete(products);

  const remoteProducts = await listProducts();
  const existingCategories = await db.select().from(categories);
  const existingSubcategories = await db.select().from(subcategories);

  const categoryMap = new Map(existingCategories.map(cat => [cat.name.toLowerCase(), cat.id]));
  const subcategoryMap = new Map(existingSubcategories.map(sub => [sub.slug, sub.id]));

  let inserted = 0;

  for (const prod of remoteProducts) {
    const categoryName = prod.category.trim();
    const categorySlug = slugify(categoryName);
    const subSlug = slugify(categoryName); // reusing category as subcategory

    // Create category if missing
    let categoryId = categoryMap.get(categoryName.toLowerCase());
    if (!categoryId) {
      const [created] = await db.insert(categories).values({
        id: categorySlug,
        name: categoryName,
        slug: categorySlug,
      }).returning();
      categoryId = created.id;
      categoryMap.set(categoryName.toLowerCase(), categoryId);
      console.log(`➕ Created category: ${categoryName}`);
    }

    // Create subcategory if missing
    let subcategoryId = subcategoryMap.get(subSlug);
    if (!subcategoryId) {
      const [created] = await db.insert(subcategories).values({
        slug: subSlug,
        name: categoryName,
        category: categoryId,
      }).returning();
      subcategoryId = created.id;
      subcategoryMap.set(subSlug, subcategoryId);
      console.log(`➕ Created subcategory: ${categoryName}`);
    }

    try {
      const { options, pricingData, metadata } = await getProductDetails(prod.id, 'en_us');

      await db.insert(products).values({
        sinaliteId: prod.id,
        name: prod.name,
        sku: prod.sku,
        slug: slugify(prod.name),
        options,
        pricingData,
        productMetadata: metadata,
        subcategoryId,
        categoryId,
        enabled: !!prod.enabled,
      });

      inserted++;
    } catch (err) {
      console.error(`❌ Failed for ${prod.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`✅ Done. Inserted ${inserted} products.`);
}

syncSinaliteProducts().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
