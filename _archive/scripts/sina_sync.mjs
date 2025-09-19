#!/usr/bin/env node
// scripts/sina_sync.mjs
// Hard-coded, one-file Sinalite sync using /auth/token and /product/:id/:storeLocale

import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import { Pool } from 'pg';
import pLimit from 'p-limit';
import cliProgress from 'cli-progress';

////////////////////////////////////////////////////////////////////////////////
// 0) HARD-CODED CONFIG
////////////////////////////////////////////////////////////////////////////////
const DATABASE_URL = 'postgres://admin:Elizabeth71676@localhost:5432/adap_db_final';

const SINA = {
  API_BASE: 'https://api.sinaliteuppy.com', // sandbox base per doc
  STORE_CODE: 9,          // numeric for DB (smallint)
  STORE_LOCALE: 'en_ca',  // string for API path: 'en_ca' or 'en_us'
  CLIENT_ID: 'JarBGsyG2zC4vRFTjLEi4TDbQrXUVEzr',
  CLIENT_SECRET: 'L292AtithgbZWAuo4UZcQXdG0s7I-TJphyaWCJKA95YpURyZGH1Qh3Ri-YauVdkJ',
  AUTH_TIMEOUT_MS: 10000,
  FETCH_TIMEOUT_MS: 45000,
  AUTH_RETRIES: 2,
};

const IDS_FILE = 'src/product_ids.txt';
const CONCURRENCY = 6;
const INSERT_BATCH = 250;

////////////////////////////////////////////////////////////////////////////////
// Helpers
////////////////////////////////////////////////////////////////////////////////
function j(x) {
  // We send JSON text to SQL and CAST to ::jsonb in the queries.
  if (x === undefined || x === null) return null;
  try { return JSON.stringify(x); }
  catch { return JSON.stringify(String(x)); }
}
function normStr(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  return s ? s : null;
}
function asCents(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return null;
  return Math.round(Number(n) * 100);
}
async function readIdsList(filePath) {
  try {
    const raw = await fs.readFile(path.resolve(process.cwd(), filePath), 'utf8');
    return raw
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => Number.isFinite(n));
  } catch {
    return [];
  }
}

////////////////////////////////////////////////////////////////////////////////
// PG
////////////////////////////////////////////////////////////////////////////////
const pool = new Pool({ connectionString: DATABASE_URL });
async function withClient(fn) {
  const c = await pool.connect();
  try { return await fn(c); } finally { c.release(); }
}

////////////////////////////////////////////////////////////////////////////////
// 1) Schema — uses store_code (smallint) + store_locale (text)
////////////////////////////////////////////////////////////////////////////////
async function ensureSchema() {
  await withClient(async (db) => {
    await db.query('BEGIN');

    // products
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGSERIAL PRIMARY KEY,
        store_code SMALLINT NOT NULL,
        store_locale TEXT,
        sina_product_id BIGINT NOT NULL,
        sku TEXT,
        name TEXT,
        description TEXT,
        price_cents INTEGER,
        currency TEXT,
        data JSONB,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS store_code SMALLINT`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS store_locale TEXT`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sina_product_id BIGINT`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS name TEXT`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_cents INTEGER`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS currency TEXT`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS data JSONB`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS enabled BOOLEAN`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
    await db.query(`ALTER TABLE products ALTER COLUMN enabled SET DEFAULT TRUE`);
    await db.query(`UPDATE products SET enabled = TRUE WHERE enabled IS NULL`);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'products' AND indexname = 'ux_products_store_sina'
        ) THEN
          CREATE UNIQUE INDEX ux_products_store_sina
          ON products (store_code, sina_product_id);
        END IF;
      END$$;
    `);

    // product_option_groups
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_option_groups (
        id BIGSERIAL PRIMARY KEY,
        store_code SMALLINT NOT NULL,
        store_locale TEXT,
        product_id BIGINT NOT NULL,
        sina_product_id BIGINT NOT NULL,
        group_key TEXT NOT NULL,
        name TEXT,
        data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`ALTER TABLE product_option_groups ADD COLUMN IF NOT EXISTS store_code SMALLINT`);
    await db.query(`ALTER TABLE product_option_groups ADD COLUMN IF NOT EXISTS store_locale TEXT`);
    await db.query(`ALTER TABLE product_option_groups ADD COLUMN IF NOT EXISTS product_id BIGINT`);
    await db.query(`ALTER TABLE product_option_groups ADD COLUMN IF NOT EXISTS sina_product_id BIGINT`);
    await db.query(`ALTER TABLE product_option_groups ADD COLUMN IF NOT EXISTS group_key TEXT`);
    await db.query(`ALTER TABLE product_option_groups ADD COLUMN IF NOT EXISTS name TEXT`);
    await db.query(`ALTER TABLE product_option_groups ADD COLUMN IF NOT EXISTS data JSONB`);
    await db.query(`ALTER TABLE product_option_groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
    await db.query(`ALTER TABLE product_option_groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'product_option_groups' AND indexname = 'ux_pog_store_prod_key'
        ) THEN
          CREATE UNIQUE INDEX ux_pog_store_prod_key
          ON product_option_groups (store_code, sina_product_id, group_key);
        END IF;
      END$$;
    `);

    // product_options
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_options (
        id BIGSERIAL PRIMARY KEY,
        store_code SMALLINT NOT NULL,
        store_locale TEXT,
        product_id BIGINT NOT NULL,
        sina_product_id BIGINT NOT NULL,
        group_key TEXT NOT NULL,
        sina_option_id BIGINT,
        value_key TEXT,
        label TEXT,
        price_delta_cents INTEGER,
        data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS store_code SMALLINT`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS store_locale TEXT`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS product_id BIGINT`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS sina_product_id BIGINT`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS group_key TEXT`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS sina_option_id BIGINT`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS value_key TEXT`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS label TEXT`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS price_delta_cents INTEGER`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS data JSONB`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
    await db.query(`ALTER TABLE product_options ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'product_options' AND indexname = 'ux_po_store_prod_group_value'
        ) THEN
          CREATE UNIQUE INDEX ux_po_store_prod_group_value
          ON product_options (store_code, sina_product_id, group_key, COALESCE(value_key, ''), COALESCE(label, ''));
        END IF;
      END$$;
    `);

    await db.query('COMMIT');
  });
}

////////////////////////////////////////////////////////////////////////////////
// 2) Auth + API calls
////////////////////////////////////////////////////////////////////////////////
async function getBearer() {
  const url = `${SINA.API_BASE}/auth/token`;
  const body = {
    client_id: SINA.CLIENT_ID,
    client_secret: SINA.CLIENT_SECRET,
    audience: 'https://apiconnect.sinalite.com',
    grant_type: 'client_credentials',
  };

  let lastErr;
  for (let i = 0; i <= SINA.AUTH_RETRIES; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify(body),
        timeout: SINA.AUTH_TIMEOUT_MS
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`auth ${res.status}: ${text}`);
      const json = JSON.parse(text);
      if (!json.access_token || !json.token_type) throw new Error(`bad auth response: ${text}`);
      return `${json.token_type} ${json.access_token}`; // "Bearer <token>"
    } catch (e) {
      lastErr = e;
      if (i === SINA.AUTH_RETRIES) break;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function fetchProduct(pid, authz) {
  // Per Sinalite doc: GET /product/:id/:storeLocale
  const url = `${SINA.API_BASE}/product/${pid}/${encodeURIComponent(SINA.STORE_LOCALE)}`;
  const res = await fetch(url, {
    headers: { authorization: authz, accept: 'application/json' },
    timeout: SINA.FETCH_TIMEOUT_MS,
  });
  if (!res.ok) throw new Error(`product ${pid} -> ${res.status}`);
  return res.json(); // 3 arrays (options/pricing/meta); we store raw in data
}

////////////////////////////////////////////////////////////////////////////////
// 3) Upserts — use store_code (smallint) + store_locale (text)
////////////////////////////////////////////////////////////////////////////////
async function upsertProduct(db, store_code, store_locale, pid, baseMeta) {
  // We use only id + raw data here. (Name/SKU can be null if not available.)
  const sina_product_id = Number(pid);
  const sku = normStr(baseMeta?.sku);
  const name = normStr(baseMeta?.name);
  const description = normStr(baseMeta?.description);
  const currency = normStr('USD');
  const price_cents = null;
  const data = j(baseMeta);

  const sql = `
    INSERT INTO products (store_code, store_locale, sina_product_id, sku, name, description, price_cents, currency, data, enabled, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,TRUE,NOW())
    ON CONFLICT (store_code, sina_product_id) DO UPDATE
      SET sku = EXCLUDED.sku,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          price_cents = EXCLUDED.price_cents,
          currency = EXCLUDED.currency,
          data = EXCLUDED.data,
          enabled = COALESCE(products.enabled, TRUE),
          updated_at = NOW()
    RETURNING id;
  `;
  const { rows } = await db.query(sql, [
    store_code, store_locale, sina_product_id, sku, name, description, price_cents, currency, data
  ]);
  return { product_pk: rows[0].id, sina_product_id };
}

async function upsertOptionGroupsAndOptions(db, store_code, store_locale, product_pk, sina_product_id, productDetail) {
  // The detail for classic products is 3 arrays. Options are the FIRST one per docs.
  // It looks like array of { id, group, name } etc.
  const optionsArray = Array.isArray(productDetail?.[0]) ? productDetail[0] : [];
  if (!optionsArray.length) return;

  // Build groups from "group" field
  const grouped = new Map(); // group_key -> { name, values: [{id, label}] }
  for (const row of optionsArray) {
    const group_key = normStr(row?.group ?? row?.name ?? row?.label);
    const label = normStr(row?.name ?? row?.option_val ?? row?.label);
    const optId = Number(row?.id ?? row?.opt_val_id ?? row?.option_id ?? 0) || null;
    if (!group_key || !label) continue;
    if (!grouped.has(group_key)) grouped.set(group_key, { name: group_key, values: [] });
    grouped.get(group_key).values.push({ id: optId, label });
  }

  const groups = [...grouped.entries()].map(([group_key, { name, values }]) => ({
    group_key, name, values,
  }));
  if (!groups.length) return;

  // Upsert groups (one UNNEST)
  {
    const group_key_arr = groups.map(g => g.group_key);
    const name_arr = groups.map(g => g.name ?? g.group_key);
    const data_arr = groups.map(g => j(g));

    const sql = `
      INSERT INTO product_option_groups (store_code, store_locale, sina_product_id, product_id, group_key, name, data, updated_at)
      SELECT
        $1::smallint, $2::text, $3::bigint, $4::bigint, un.group_key, un.name, un.data::jsonb, NOW()
      FROM UNNEST($5::text[], $6::text[], $7::text[]) AS un(group_key, name, data)
      ON CONFLICT (store_code, sina_product_id, group_key) DO UPDATE
        SET name = EXCLUDED.name,
            data = EXCLUDED.data,
            updated_at = NOW();
    `;
    await db.query(sql, [
      store_code,
      store_locale,
      sina_product_id,
      product_pk,
      group_key_arr,
      name_arr,
      data_arr
    ]);
  }

  // Upsert options (batched UNNEST)
  const optionRows = [];
  for (const g of groups) {
    for (const v of (g.values ?? [])) {
      const sina_option_id = Number(v?.id) || null;
      const value_key = normStr(v?.label);
      const label = normStr(v?.label ?? value_key);
      const delta = 0; // classic products: price deltas constructed client-side; keep 0
      optionRows.push([
        store_code,           // 0
        store_locale,         // 1
        sina_product_id,      // 2
        product_pk,           // 3
        g.group_key,          // 4
        sina_option_id,       // 5
        value_key,            // 6
        label,                // 7
        delta,                // 8
        j(v),                 // 9  (json text)
      ]);
    }
  }
  if (!optionRows.length) return;

  for (let i = 0; i < optionRows.length; i += INSERT_BATCH) {
    const chunk = optionRows.slice(i, i + INSERT_BATCH);

    const storeCodes   = chunk.map(r => r[0]); // smallint[]
    const storeLocales = chunk.map(r => r[1]); // text[]
    const sinaProdIds  = chunk.map(r => r[2]); // bigint[]
    const productIds   = chunk.map(r => r[3]); // bigint[]
    const groupKeys    = chunk.map(r => r[4]); // text[]
    const sinaOptIds   = chunk.map(r => r[5]); // bigint[]
    const valueKeys    = chunk.map(r => r[6]); // text[]
    const labels       = chunk.map(r => r[7]); // text[]
    const deltas       = chunk.map(r => r[8]); // int[]
    const datas        = chunk.map(r => r[9]); // json text[]

    const sql = `
      INSERT INTO product_options
        (store_code, store_locale, sina_product_id, product_id, group_key, sina_option_id, value_key, label, price_delta_cents, data, updated_at)
      SELECT
        un.store_code, un.store_locale, un.sina_product_id, un.product_id, un.group_key,
        un.sina_option_id, un.value_key, un.label, un.delta, un.data::jsonb, NOW()
      FROM UNNEST(
        $1::smallint[],
        $2::text[],
        $3::bigint[],
        $4::bigint[],
        $5::text[],
        $6::bigint[],
        $7::text[],
        $8::text[],
        $9::int[],
        $10::text[]
      ) AS un(store_code, store_locale, sina_product_id, product_id, group_key, sina_option_id, value_key, label, delta, data)
      ON CONFLICT (store_code, sina_product_id, group_key, COALESCE(value_key, ''), COALESCE(label, '')) DO UPDATE
        SET sina_option_id = COALESCE(EXCLUDED.sina_option_id, product_options.sina_option_id),
            price_delta_cents = EXCLUDED.price_delta_cents,
            data = EXCLUDED.data,
            updated_at = NOW();
    `;
    await db.query(sql, [
      storeCodes,
      storeLocales,
      sinaProdIds,
      productIds,
      groupKeys,
      sinaOptIds,
      valueKeys,
      labels,
      deltas,
      datas
    ]);
  }
}

////////////////////////////////////////////////////////////////////////////////
// 4) Main
////////////////////////////////////////////////////////////////////////////////
async function main() {
  console.log('👉 Using (hard-coded):');
  console.log(`   DB           = ${DATABASE_URL}`);
  console.log(`   API_BASE     = ${SINA.API_BASE}`);
  console.log(`   STORE_CODE   = ${SINA.STORE_CODE}`);
  console.log(`   STORE_LOCALE = ${SINA.STORE_LOCALE}`);
  console.log(`   IDS_FILE     = ${IDS_FILE}`);

  await ensureSchema();

  const ids = await readIdsList(IDS_FILE);
  if (!ids.length) {
    console.log('No IDs found.');
    return;
  }

  const authz = await getBearer();

  const bar = new cliProgress.SingleBar({
    format: '[{bar}] {value}/{total}  {ok}✓ {err}✖',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
  });
  bar.start(ids.length, 0, { ok: 0, err: 0 });

  const limit = pLimit(CONCURRENCY);
  let ok = 0, err = 0;

  const tasks = ids.map((pid) => limit(async () => {
    try {
      const detail = await fetchProduct(pid, authz); // detail is 3 arrays; stored raw
      await withClient(async (db) => {
        await db.query('BEGIN');
        try {
          const { product_pk, sina_product_id } =
            await upsertProduct(db, SINA.STORE_CODE, SINA.STORE_LOCALE, pid, detail);
          await upsertOptionGroupsAndOptions(
            db, SINA.STORE_CODE, SINA.STORE_LOCALE, product_pk, sina_product_id, detail
          );
          await db.query('COMMIT');
        } catch (e) {
          await db.query('ROLLBACK');
          throw e;
        }
      });
      ok++;
    } catch (e) {
      err++;
      process.stdout.write(`\n✖ ${pid}: ${e?.message ?? String(e)}\n`);
    } finally {
      bar.update(ok + err, { ok, err });
    }
  }));

  await Promise.all(tasks);
  bar.stop();
  console.log(`Done. ok=${ok} err=${err}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
