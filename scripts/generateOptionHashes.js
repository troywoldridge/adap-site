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

const insertBatchSize = 1000; // Adjust batch size based on your use case
let insertBatch = [];

async function query(text, params) {
  return pool.query(text, params);
}

// Fetch all distinct product IDs
async function getAllProductIds() {
  const res = await query(`SELECT DISTINCT product_id FROM options`);
  return res.rows.map(row => row.product_id);
}

// Fetch options by group for a product
async function getOptionsByGroup(productId) {
  const res = await query(`SELECT * FROM options WHERE product_id = $1`, [productId]);
  const groups = {};
  for (const opt of res.rows) {
    const group = opt.group_name?.trim()?.toLowerCase();
    if (!group) continue;
    if (!groups[group]) groups[group] = [];
    groups[group].push(opt);
  }
  return groups;
}

// Generate all possible combinations of option groups
function generateCombinations(optionGroups) {
  const [first, ...rest] = optionGroups;
  let combinations = first.map(opt => [opt]);

  for (const group of rest) {
    combinations = combinations.flatMap(combo =>
      group.map(opt => [...combo, opt])
    );
  }

  return combinations;
}

// Format the option IDs into a chain and generate the hash
function formatChain(optionIds) {
  const padded = optionIds.map(id => id.toString().padStart(2, "0"));
  const chain = padded.join("");
  const hash = crypto.createHash("md5").update(chain).digest("hex");
  return { chain, hash };
}

// Fetch pricing ID for a product and hash
async function getPricingId(productId, hash) {
  const res = await query(
    `SELECT id FROM pricing WHERE product_id = $1 AND hash = $2 LIMIT 1`,
    [productId, hash]
  );
  return res.rows[0]?.id || null;
}

// Batch insert hashes into the database
async function insertBatchHashes() {
  if (insertBatch.length === 0) return;

  const sql = `
    INSERT INTO product_option_hashes (product_id, option_ids, option_chain, hash, pricing_id)
    VALUES
      ${insertBatch.map((_, index) => `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`).join(", ")}
    ON CONFLICT (product_id, option_chain) DO UPDATE
    SET updated_at = NOW(), pricing_id = COALESCE(EXCLUDED.pricing_id, product_option_hashes.pricing_id)
  `;
  
  const values = insertBatch.flat();
  await query(sql, values);
  console.log(`✅ Batch insert of ${insertBatch.length} hashes completed`);
  insertBatch = []; // Reset the batch after insert
}

// Insert a hash into the batch, checking if it already exists
async function insertHash(productId, optionIds, option_chain, hash, pricing_id) {
  // Add the hash to the batch
  insertBatch.push([productId, JSON.stringify(optionIds), option_chain, hash, pricing_id]);

  // If the batch size exceeds the limit, insert the batch
  if (insertBatch.length >= insertBatchSize) {
    await insertBatchHashes();
  }
}

// Process a single product
async function processProduct(productId) {
  const optionGroups = await getOptionsByGroup(productId);
  const groupNames = Object.keys(optionGroups);

  if (groupNames.length === 0) {
    console.warn(`⚠️ Skipping product ${productId}: no option groups found`);
    return;
  }

  const combinations = generateCombinations(groupNames.map(name => optionGroups[name]));
  const hashesToInsert = [];
  const existingHashesSet = new Set();

  for (const combo of combinations) {
    const optionIds = combo.map(opt => opt.option_id);
    const { chain: option_chain, hash } = formatChain(optionIds);

    // Check if the hash exists in the set
    if (existingHashesSet.has(hash)) {
      console.log(`⚠️ Skipping existing hash for product ${productId} and chain ${option_chain}`);
      continue;
    }

    existingHashesSet.add(hash);
    hashesToInsert.push({ productId, optionIds, option_chain, hash });
  }

  // After processing all combinations, insert the batch
  await insertHashesInBatch(hashesToInsert);
}

// Insert all hashes in batch
async function insertHashesInBatch(hashesToInsert) {
  const values = hashesToInsert.flatMap(item => [
    item.productId, 
    JSON.stringify(item.optionIds), 
    item.option_chain, 
    item.hash, 
    await getPricingId(item.productId, item.hash)
  ]);
  
  const sql = `
    INSERT INTO product_option_hashes (product_id, option_ids, option_chain, hash, pricing_id)
    VALUES
      ${hashesToInsert.map((_, index) => `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`).join(", ")}
    ON CONFLICT (product_id, option_chain) DO UPDATE
    SET updated_at = NOW(), pricing_id = COALESCE(EXCLUDED.pricing_id, product_option_hashes.pricing_id)
  `;
  
  await query(sql, values);
  console.log(`✅ Inserted ${hashesToInsert.length} hashes in batch`);
}

// Main function to execute the script
async function main() {
  try {
    const productIds = await getAllProductIds();
    console.log(`🔍 Found ${productIds.length} products`);

    // Process products in parallel
    const productProcesses = productIds.map(productId => processProduct(productId));
    await Promise.all(productProcesses);

    // Final batch insert if any records are left
    await insertBatchHashes();
  } catch (err) {
    console.error("🔥 Error during hash generation:", err.message);
  } finally {
    await pool.end();
    console.log("🏁 Done");
  }
}

main();
