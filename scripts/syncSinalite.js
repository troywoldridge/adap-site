import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || "5432", 10),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl:
    process.env.PGSSLMODE === "require"
      ? { rejectUnauthorized: false }
      : false,
});

async function query(text, params) {
  return pool.query(text, params);
}

// ------------------
// Drop unique constraints/indexes that block duplicates on pricing
// ------------------
async function dropPricingUniqueConstraints() {
  try {
    await query(`ALTER TABLE pricing DROP CONSTRAINT IF EXISTS pricing_hash_unique;`);
    await query(`ALTER TABLE pricing DROP CONSTRAINT IF EXISTS unique_option_chain;`);

    await query(`DROP INDEX IF EXISTS pricing_hash_unique;`);
    await query(`DROP INDEX IF EXISTS unique_option_chain;`);

    console.log("✅ Dropped unique constraints/indexes on pricing table");
  } catch (err) {
    console.warn("⚠️ Could not drop unique constraints/indexes on pricing:", err.message);
  }
}

// ------------------
// Truncate all related tables with RESTART IDENTITY CASCADE
// ------------------
async function truncateTables() {
  console.log("🔄 Truncating tables...");
  const tables = [
    "product_option_hashes",
    "pricing",
    "options",
    "product_sync_logs",
    "product_variants",
    "images",
    "products",
    "options_groups",
  ];

  // Confirm which tables exist before truncating
  const existingTablesRes = await query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public'`
  );
  const existingTables = existingTablesRes.rows.map((r) => r.tablename);

  const tablesToTruncate = tables.filter((t) => existingTables.includes(t));

  if (tablesToTruncate.length === 0) {
    console.warn("⚠️ No matching tables to truncate!");
    return;
  }

  const sql = `TRUNCATE TABLE ${tablesToTruncate
    .map((t) => `"${t}"`)
    .join(", ")} RESTART IDENTITY CASCADE;`;
  await query(sql);
  console.log(`✅ Truncated tables: ${tablesToTruncate.join(", ")}`);
}

// ------------------
// Get Sinalite API Auth Token
// ------------------
async function getAccessToken() {
  const res = await fetch("https://api.sinaliteuppy.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SINALITE_CLIENT_ID,
      client_secret: process.env.SINALITE_CLIENT_SECRET,
      audience: "https://apiconnect.sinalite.com",
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    throw new Error(`Auth failed: ${res.statusText}`);
  }
  const data = await res.json();
  return `${data.token_type} ${data.access_token}`;
}

// ------------------
// Fetch all products from Sinalite API
// ------------------
async function fetchAllProducts(token) {
  const res = await fetch("https://api.sinaliteuppy.com/product", {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error("Failed fetching products");
  return await res.json();
}

// ------------------
// Fetch product options and pricing details for one product
// ------------------
async function fetchProductDetails(productId, token, storeCode = "en_ca") {
  const url = `https://api.sinaliteuppy.com/product/${productId}/${storeCode}`;
  const res = await fetch(url, { headers: { Authorization: token } });
  if (!res.ok)
    throw new Error(`Failed fetching details for product ${productId}`);
  return await res.json(); // returns [optionsArray, pricingArray]
}

// ------------------
// Insert or update a product row
// ------------------
async function upsertProduct(product) {
  const sql = `
    INSERT INTO products (id, name, category, enabled, sku)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      enabled = EXCLUDED.enabled,
      sku = EXCLUDED.sku,
      updated_at = NOW()
  `;

  const values = [
    product.id,
    product.name || "Unnamed Product",
    product.category || null,
    product.enabled ?? false,
    product.sku || null,
  ];

  await query(sql, values);

  await query(
    `INSERT INTO product_sync_logs (product_id, sync_message) VALUES ($1, $2)`,
    [product.id, `Synced product ${product.id}: ${product.name || "Unnamed"}`]
  );
}

// ------------------
// Insert or update options for a product
// Note: your 'options' table must have UNIQUE constraint on (product_id, option_id)
// ------------------
async function upsertOptions(productId, optionsArray) {
  for (const opt of optionsArray) {
    const sql = `
      INSERT INTO options (product_id, "group", option_id, name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (product_id, option_id) DO UPDATE SET
        "group" = EXCLUDED."group",
        name = EXCLUDED.name,
        updated_at = NOW()
    `;
    const values = [
      productId,
      opt.group || null,
      parseInt(opt.id) || 0,
      opt.name || "Unnamed Option",
    ];
    try {
      await query(sql, values);
    } catch (err) {
      console.error(`Error upserting option ${opt.id} for product ${productId}:`, err.message);
    }
  }
}

// ------------------
// Insert or update pricing data for a product
// Note: your 'pricing' table must have UNIQUE constraint on 'hash'
// ------------------
async function upsertPricing(productId, pricingArray, optionIds) {
  const optionChain =
    Array.isArray(optionIds) && optionIds.length > 0
      ? optionIds.map((id) => id.toString().padStart(2, "0")).join("")
      : "";

  for (const price of pricingArray) {
    const sql = `
      INSERT INTO pricing (product_id, option_ids, option_chain, hash, price, type, value, row_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (hash) DO UPDATE SET
        product_id = EXCLUDED.product_id,
        option_ids = EXCLUDED.option_ids,
        option_chain = EXCLUDED.option_chain,
        price = EXCLUDED.price,
        type = COALESCE(EXCLUDED.type, pricing.type),
        value = COALESCE(EXCLUDED.value, pricing.value),
        row_number = COALESCE(EXCLUDED.row_number, pricing.row_number),
        updated_at = NOW()
    `;

    const priceValue =
      price.value !== undefined && price.value !== null
        ? parseFloat(price.value)
        : null;

    const typeValue = price.type || null;

    const rowNumberValue =
      price.row_number !== undefined && price.row_number !== null
        ? parseInt(price.row_number)
        : null;

    const values = [
      productId,
      optionIds || [],
      optionChain,
      price.hash,
      priceValue,
      typeValue,
      priceValue, // Assuming value same as price, adjust if needed
      rowNumberValue,
    ];

    try {
      await query(sql, values);
    } catch (err) {
      console.error(
        `Error upserting pricing hash ${price.hash} for product ${productId}:`,
        err.message
      );
    }
  }
}

// ------------------
// Main sync function
// ------------------
async function syncSinaliteData() {
  try {
    await dropPricingUniqueConstraints();
    await truncateTables();

    const token = await getAccessToken();
    console.log("🔐 Authenticated with Sinalite API");

    const products = await fetchAllProducts(token);
    console.log(`📦 Retrieved ${products.length} products`);

    for (const product of products) {
      try {
        console.log(`🔄 Syncing product ${product.id}: ${product.name}`);

        await upsertProduct(product);

        const [optionData, pricingData] = await fetchProductDetails(product.id, token);

        if (!optionData || !pricingData) {
          console.warn(`⚠️ Missing options or pricing for product ${product.id}`);
          continue;
        }

        await upsertOptions(product.id, optionData);

        const optionIds = optionData.map((opt) => parseInt(opt.id));

        await upsertPricing(product.id, pricingData, optionIds);

        console.log(`✅ Done syncing product ${product.id}`);
      } catch (err) {
        console.error(`❌ Failed syncing product ${product.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("🔥 Fatal error:", err.message);
  } finally {
    await pool.end();
    console.log("🏁 Sync finished.");
  }
}

syncSinaliteData();
