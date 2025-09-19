import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || "5432"),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

const BATCH_SIZE = 1000; // tune based on memory / performance tradeoff

async function query(text, params) {
  return pool.query(text, params);
}

async function getAllProductIds() {
  const res = await query(`SELECT DISTINCT product_id FROM options`);
  return res.rows.map(r => r.product_id);
}

async function getOptionsByGroup(productId) {
  const res = await query(`SELECT * FROM options WHERE product_id = $1`, [productId]);
  const groups = {};
  for (const opt of res.rows) {
    const group = (opt.group_name || opt.group || "").toString().trim().toLowerCase();
    if (!group) continue;
    if (!groups[group]) groups[group] = [];
    groups[group].push(opt);
  }
  return groups;
}

function generateCombinations(optionGroups) {
  if (!optionGroups || optionGroups.length === 0) return [];
  const [first, ...rest] = optionGroups;
  let combos = first.map(o => [o]);
  for (const group of rest) {
    combos = combos.flatMap(existing =>
      group.map(o => [...existing, o])
    );
  }
  return combos;
}

function formatChain(optionIds) {
  const padded = optionIds.map(id => id.toString().padStart(2, "0"));
  const option_chain = padded.join("");
  const hash = crypto.createHash("md5").update(option_chain).digest("hex");
  return { option_chain, hash };
}

async function getPricingIdsForHashes(productId, hashes) {
  if (hashes.length === 0) return {};
  const res = await query(
    `SELECT hash, id FROM pricing WHERE product_id = $1 AND hash = ANY($2)`,
    [productId, hashes]
  );
  const map = {};
  for (const row of res.rows) {
    map[row.hash] = row.id;
  }
  return map;
}

async function getExistingChains(productId, chains) {
  if (chains.length === 0) return new Set();
  const res = await query(
    `SELECT option_chain FROM product_option_hashes WHERE product_id = $1 AND option_chain = ANY($2)`,
    [productId, chains]
  );
  return new Set(res.rows.map(r => r.option_chain));
}

async function insertHashesInBatch(preppedRows) {
  if (preppedRows.length === 0) return;
  // preppedRows: array of { productId, optionIds, option_chain, hash, pricing_id }
  const values = [];
  const placeholders = preppedRows
    .map((_, i) => {
      const base = i * 5;
      // ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10), ...
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    })
    .join(", ");

  for (const row of preppedRows) {
    values.push(
      row.productId,
      JSON.stringify(row.optionIds),
      row.option_chain,
      row.hash,
      row.pricing_id
    );
  }

  const sql = `
    INSERT INTO product_option_hashes (product_id, option_ids, option_chain, hash, pricing_id)
    VALUES ${placeholders}
    ON CONFLICT (product_id, option_chain) DO UPDATE
    SET updated_at = NOW(),
        pricing_id = COALESCE(EXCLUDED.pricing_id, product_option_hashes.pricing_id)
  `;
  await query(sql, values);
}

async function processProduct(productId) {
  const optionGroupsObj = await getOptionsByGroup(productId);
  const groupNames = Object.keys(optionGroupsObj);
  if (groupNames.length === 0) {
    console.warn(`⚠️ Skipping product ${productId}: no option groups found`);
    return;
  }

  const optionGroups = groupNames.map(name => optionGroupsObj[name]);
  const combos = generateCombinations(optionGroups);
  if (combos.length === 0) {
    console.warn(`⚠️ No combinations for product ${productId}`);
    return;
  }

  // Build chain/hash list
  const chainHashPairs = combos.map(combo => {
    const optionIds = combo.map(o => o.option_id);
    const { option_chain, hash } = formatChain(optionIds);
    return { optionIds, option_chain, hash };
  });

  // Deduplicate by chain in-memory
  const uniqueByChain = new Map(); // option_chain -> { optionIds, hash }
  for (const { optionIds, option_chain, hash } of chainHashPairs) {
    if (!uniqueByChain.has(option_chain)) {
      uniqueByChain.set(option_chain, { optionIds, hash });
    }
  }

  const allChains = Array.from(uniqueByChain.keys());
  const allHashes = Array.from(new Set(Array.from(uniqueByChain.values()).map(v => v.hash)));

  // Fetch existing chains to skip
  const existingChainsSet = await getExistingChains(productId, allChains);

  // Fetch pricing ids for all hashes (only those we might insert)
  const pricingIdMap = await getPricingIdsForHashes(productId, allHashes);

  // Prepare rows to upsert in batches
  const toInsert = [];
  for (const [option_chain, { optionIds, hash }] of uniqueByChain.entries()) {
    if (existingChainsSet.has(option_chain)) {
      // skip existing
      continue;
    }
    const pricing_id = pricingIdMap[hash] || null;
    toInsert.push({
      productId,
      optionIds,
      option_chain,
      hash,
      pricing_id,
    });
    if (toInsert.length >= BATCH_SIZE) {
      await insertHashesInBatch(toInsert);
      toInsert.length = 0; // clear
    }
  }

  // final flush for this product
  if (toInsert.length > 0) {
    await insertHashesInBatch(toInsert);
  }

  console.log(`✅ Product ${productId}: processed combinations=${combos.length}, inserted=${/* approximate count */ "see logs"}`);
}

async function main() {
  try {
    // Optional: fresh start
    // await query('TRUNCATE TABLE product_option_hashes RESTART IDENTITY CASCADE');
    // console.log("🧹 Truncated product_option_hashes");

    const productIds = await getAllProductIds();
    console.log(`🔍 Found ${productIds.length} products`);

    // Process products with controlled concurrency to avoid overwhelming the DB
    const CONCURRENCY = 5; // tune: how many products at once
    for (let i = 0; i < productIds.length; i += CONCURRENCY) {
      const chunk = productIds.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(pid => processProduct(pid)));
    }
  } catch (err) {
    console.error("🔥 Error during hash generation:", err);
  } finally {
    await pool.end();
    console.log("🏁 Done");
  }
}

main();

