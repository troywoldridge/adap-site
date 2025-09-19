import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || "5432"),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  return pool.query(text, params);
}

async function setupTables() {
  console.log("🚧 Dropping and recreating tables...");
  const sql = `
    DROP TABLE IF EXISTS pricing;
    DROP TABLE IF EXISTS options;
    DROP TABLE IF EXISTS products;

    CREATE TABLE products (
      id INT,
      sku TEXT,
      name TEXT,
      category TEXT,
      enabled BOOLEAN,
      metadata_json JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE options (
      product_id INT,
      group_name TEXT,
      option_id INT,
      name TEXT,
      html_type TEXT,
      opt_sort_order INT,
      opt_val_id INT,
      option_val TEXT,
      img_src TEXT,
      opt_val_sort_order INT,
      extra_turnaround_days INT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE pricing (
      product_id INT,
      hash TEXT,
      value TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await query(sql);
  console.log("✅ Tables setup complete");
}

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

async function fetchAllProducts(token) {
  const res = await fetch("https://api.sinaliteuppy.com/product", {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`Failed fetching products: ${res.statusText}`);
  return res.json();
}

async function fetchProductDetails(productId, token, storeCode = "en_ca") {
  const url = `https://api.sinaliteuppy.com/product/${productId}/${storeCode}`;
  const res = await fetch(url, { headers: { Authorization: token } });
  if (!res.ok)
    throw new Error(`Failed fetching product details for ${productId}: ${res.statusText}`);
  return res.json(); // [options[], pricing[], metadataObj]
}

async function insertProduct(product) {
  const sql = `INSERT INTO products (id, sku, name, category, enabled, metadata_json) VALUES ($1, $2, $3, $4, $5, $6)`;
  const values = [
    product.id,
    product.sku || null,
    product.name || null,
    product.category || null,
    product.enabled === 1 || product.enabled === true,
    product.metadata ? JSON.stringify(product.metadata) : null,
  ];
  await query(sql, values);
}

async function insertOptions(productId, options) {
  const sql = `INSERT INTO options (
    product_id, group_name, option_id, name, html_type,
    opt_sort_order, opt_val_id, option_val, img_src,
    opt_val_sort_order, extra_turnaround_days
  ) VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
  )`;

  for (const opt of options) {
    await query(sql, [
      productId,
      opt.group || opt.group_name || null,
      parseInt(opt.id || opt.option_id),
      opt.name || opt.option_val || null,
      opt.html_type || null,
      opt.opt_sort_order || null,
      opt.opt_val_id || null,
      opt.option_val || null,
      opt.img_src || null,
      opt.opt_val_sort_order || null,
      opt.extra_turnaround_days || null,
    ]);
  }
}

async function insertPricing(productId, pricing) {
  const sql = `INSERT INTO pricing (product_id, hash, value) VALUES ($1, $2, $3)`;
  for (const price of pricing) {
    await query(sql, [productId, price.hash, price.value]);
  }
}

async function sync() {
  try {
    await setupTables();

    const token = await getAccessToken();
    console.log("🔐 Authenticated with Sinalite");

    const products = await fetchAllProducts(token);
    console.log(`📦 Fetched ${products.length} products from Sinalite`);

    for (const product of products) {
      console.log(`🔄 Syncing product ${product.id}: ${product.name}`);

      try {
        const [options, pricing, metadata] = await fetchProductDetails(product.id, token);

        await insertProduct({ ...product, metadata });

        if (Array.isArray(options)) {
          await insertOptions(product.id, options);
        } else {
          console.warn(`⚠️ Options missing or invalid for product ${product.id}`);
        }

        if (Array.isArray(pricing)) {
          await insertPricing(product.id, pricing);
        } else {
          console.warn(`⚠️ Pricing missing or invalid for product ${product.id}`);
        }

        console.log(`✅ Done syncing product ${product.id}`);
      } catch (err) {
        console.error(`❌ Failed syncing product ${product.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("🔥 Fatal error:", err.message);
  } finally {
    await pool.end();
    console.log("🏁 Sync finished");
  }
}

sync();
