-- src/db/sina_fix_schema.sql
BEGIN;

-- ============== PRODUCTS (composite PK) ==============
CREATE TABLE IF NOT EXISTS products (
  id          BIGINT      NOT NULL,
  store_code  SMALLINT    NOT NULL DEFAULT 9,
  sku         TEXT,
  name        TEXT,
  category    TEXT,
  enabled     SMALLINT,
  meta        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, store_code)
);

-- For older installs missing columns:
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS store_code SMALLINT NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  ALTER COLUMN sku DROP NOT NULL;   -- make resilient to odd API gaps
-- helpful index on (id) alone for foreign FKs that only carried id:
CREATE INDEX IF NOT EXISTS ix_products_id ON products(id);

-- ============== OPTION GROUPS =========================
CREATE TABLE IF NOT EXISTS product_option_groups (
  id          BIGSERIAL   PRIMARY KEY,
  product_id  BIGINT      NOT NULL,
  store_code  SMALLINT    NOT NULL DEFAULT 9,
  -- canonical key we upsert against (e.g. "size", "qty", "Stock", "Turnaround")
  group_key   TEXT,
  -- back-compat: some older tables used "name"
  name        TEXT,
  group_label TEXT,
  meta        JSONB       NOT NULL DEFAULT '{}'::jsonb
);

-- Ensure columns exist (idempotent):
ALTER TABLE product_option_groups
  ADD COLUMN IF NOT EXISTS store_code  SMALLINT NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS group_key   TEXT,
  ADD COLUMN IF NOT EXISTS name        TEXT,
  ADD COLUMN IF NOT EXISTS group_label TEXT,
  ADD COLUMN IF NOT EXISTS meta        JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill group_key from name if missing:
UPDATE product_option_groups
SET group_key = COALESCE(group_key, NULLIF(name, ''))
WHERE group_key IS NULL;

-- Unique key we use for ON CONFLICT:
CREATE UNIQUE INDEX IF NOT EXISTS ux_pog_product_store_key
  ON product_option_groups (product_id, store_code, group_key);

-- FK to products composite PK:
ALTER TABLE product_option_groups
  DROP CONSTRAINT IF EXISTS product_option_groups_product_fk,
  ADD  CONSTRAINT product_option_groups_product_fk
  FOREIGN KEY (product_id, store_code) REFERENCES products(id, store_code)
  ON DELETE CASCADE;

-- ============== OPTIONS ===============================
CREATE TABLE IF NOT EXISTS product_options (
  id           BIGSERIAL   PRIMARY KEY,
  product_id   BIGINT      NOT NULL,
  store_code   SMALLINT    NOT NULL DEFAULT 9,
  group_key    TEXT        NOT NULL,
  option_id    BIGINT      NOT NULL,      -- SinaLite option ID
  option_name  TEXT        NOT NULL,
  hidden       SMALLINT    NOT NULL DEFAULT 0,
  sort_index   INTEGER,
  meta         JSONB       NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE product_options
  ADD COLUMN IF NOT EXISTS store_code  SMALLINT NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS group_key   TEXT,
  ADD COLUMN IF NOT EXISTS option_id   BIGINT,
  ADD COLUMN IF NOT EXISTS option_name TEXT,
  ADD COLUMN IF NOT EXISTS hidden      SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_index  INTEGER,
  ADD COLUMN IF NOT EXISTS meta        JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Unique de-dupe inside a product+group:
CREATE UNIQUE INDEX IF NOT EXISTS ux_po_product_store_group_option
  ON product_options (product_id, store_code, group_key, option_id);

-- FK(s):
ALTER TABLE product_options
  DROP CONSTRAINT IF EXISTS product_options_product_fk,
  ADD  CONSTRAINT product_options_product_fk
  FOREIGN KEY (product_id, store_code) REFERENCES products(id, store_code)
  ON DELETE CASCADE;

ALTER TABLE product_options
  DROP CONSTRAINT IF EXISTS product_options_group_fk,
  ADD  CONSTRAINT product_options_group_fk
  FOREIGN KEY (product_id, store_code, group_key)
  REFERENCES product_option_groups (product_id, store_code, group_key)
  ON DELETE CASCADE;

-- ============== PRICING META (hashes) =================
CREATE TABLE IF NOT EXISTS product_pricing_meta (
  id          BIGSERIAL  PRIMARY KEY,
  product_id  BIGINT     NOT NULL,
  store_code  SMALLINT   NOT NULL DEFAULT 9,
  hash        TEXT       NOT NULL,
  value       TEXT,
  markup      NUMERIC,
  meta        JSONB      NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE product_pricing_meta
  ADD COLUMN IF NOT EXISTS store_code SMALLINT NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS hash       TEXT,
  ADD COLUMN IF NOT EXISTS value      TEXT,
  ADD COLUMN IF NOT EXISTS markup     NUMERIC,
  ADD COLUMN IF NOT EXISTS meta       JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ppm_product_store_hash
  ON product_pricing_meta (product_id, store_code, hash);

ALTER TABLE product_pricing_meta
  DROP CONSTRAINT IF EXISTS product_pricing_meta_product_fk,
  ADD  CONSTRAINT product_pricing_meta_product_fk
  FOREIGN KEY (product_id, store_code) REFERENCES products(id, store_code)
  ON DELETE CASCADE;

COMMIT;

-- quick sanity
SELECT 'products_pk' AS name, COUNT(*) FROM pg_indexes WHERE tablename='products' AND indexname='products_pkey'
UNION ALL
SELECT 'pog_unique', COUNT(*) FROM pg_indexes WHERE tablename='product_option_groups' AND indexname='ux_pog_product_store_key'
UNION ALL
SELECT 'po_unique', COUNT(*) FROM pg_indexes WHERE tablename='product_options' AND indexname='ux_po_product_store_group_option'
UNION ALL
SELECT 'ppm_unique', COUNT(*) FROM pg_indexes WHERE tablename='product_pricing_meta' AND indexname='ux_ppm_product_store_hash';
