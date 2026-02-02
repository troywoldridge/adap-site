BEGIN;

-- =========================
-- PRODUCTS (composite PK)
-- =========================
CREATE TABLE IF NOT EXISTS products (
  id          BIGINT       NOT NULL,
  store_code  SMALLINT     NOT NULL DEFAULT 9,
  sku         TEXT,                        -- allow NULL (some Sinalite products lack sku)
  name        TEXT,
  category    TEXT,
  enabled     SMALLINT,
  meta        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, store_code)
);

-- Make sure the columns exist even if table pre-dated this script
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS store_code SMALLINT NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS sku        TEXT,
  ADD COLUMN IF NOT EXISTS name       TEXT,
  ADD COLUMN IF NOT EXISTS category   TEXT,
  ADD COLUMN IF NOT EXISTS enabled    SMALLINT,
  ADD COLUMN IF NOT EXISTS meta       JSONB NOT NULL DEFAULT '{}'::jsonb;

-- =========================
-- PRODUCT OPTION GROUPS
-- =========================
CREATE TABLE IF NOT EXISTS product_option_groups (
  id          BIGSERIAL    PRIMARY KEY,
  product_id  BIGINT       NOT NULL,
  store_code  SMALLINT     NOT NULL DEFAULT 9,
  group_key   TEXT         NOT NULL,        -- e.g. "size", "stock", "qty"
  group_label TEXT,                          -- pretty label if present
  meta        JSONB        NOT NULL DEFAULT '{}'::jsonb
);

-- Ensure columns exist (for old tables)
ALTER TABLE product_option_groups
  ADD COLUMN IF NOT EXISTS store_code  SMALLINT NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS group_key   TEXT,
  ADD COLUMN IF NOT EXISTS group_label TEXT,
  ADD COLUMN IF NOT EXISTS meta        JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Unique group per product/store
CREATE UNIQUE INDEX IF NOT EXISTS ux_pog_product_store_key
  ON product_option_groups (product_id, store_code, group_key);

-- FK -> products
ALTER TABLE product_option_groups
  DROP CONSTRAINT IF EXISTS product_option_groups_product_fk;
ALTER TABLE product_option_groups
  ADD  CONSTRAINT product_option_groups_product_fk
  FOREIGN KEY (product_id, store_code)
  REFERENCES products (id, store_code)
  ON DELETE CASCADE;

-- =========================
-- PRODUCT OPTIONS (each value inside a group)
-- =========================
CREATE TABLE IF NOT EXISTS product_options (
  id             BIGSERIAL   PRIMARY KEY,
  product_id     BIGINT      NOT NULL,
  store_code     SMALLINT    NOT NULL DEFAULT 9,
  group_key      TEXT        NOT NULL,     -- must match product_option_groups.group_key
  option_key     TEXT        NOT NULL,     -- stable key (code) for the option value
  option_label   TEXT,                     -- human display for the option
  sina_option_id BIGINT,                   -- may be NULL (not always provided)
  hidden         SMALLINT    NOT NULL DEFAULT 0,
  sort_index     INTEGER,
  meta           JSONB       NOT NULL DEFAULT '{}'::jsonb
);

-- Ensure columns exist (for old tables)
ALTER TABLE product_options
  ADD COLUMN IF NOT EXISTS store_code     SMALLINT NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS group_key      TEXT,
  ADD COLUMN IF NOT EXISTS option_key     TEXT,
  ADD COLUMN IF NOT EXISTS option_label   TEXT,
  ADD COLUMN IF NOT EXISTS sina_option_id BIGINT,
  ADD COLUMN IF NOT EXISTS hidden         SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_index     INTEGER,
  ADD COLUMN IF NOT EXISTS meta           JSONB NOT NULL DEFAULT '{}'::jsonb;

-- de-dupe within a product/group
CREATE UNIQUE INDEX IF NOT EXISTS ux_po_product_store_group_option
  ON product_options (product_id, store_code, group_key, option_key);

-- FKs
ALTER TABLE product_options
  DROP CONSTRAINT IF EXISTS product_options_product_fk;
ALTER TABLE product_options
  ADD  CONSTRAINT product_options_product_fk
  FOREIGN KEY (product_id, store_code)
  REFERENCES products (id, store_code)
  ON DELETE CASCADE;

ALTER TABLE product_options
  DROP CONSTRAINT IF EXISTS product_options_group_fk;
ALTER TABLE product_options
  ADD  CONSTRAINT product_options_group_fk
  FOREIGN KEY (product_id, store_code, group_key)
  REFERENCES product_option_groups (product_id, store_code, group_key)
  ON DELETE CASCADE;

-- =========================
-- PRICING META (hash buckets)
-- =========================
CREATE TABLE IF NOT EXISTS product_pricing_meta (
  id          BIGSERIAL  PRIMARY KEY,
  product_id  BIGINT     NOT NULL,
  store_code  SMALLINT   NOT NULL DEFAULT 9,
  hash        TEXT       NOT NULL,     -- unique hash for a config combination from API
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
  DROP CONSTRAINT IF EXISTS product_pricing_meta_product_fk;
ALTER TABLE product_pricing_meta
  ADD  CONSTRAINT product_pricing_meta_product_fk
  FOREIGN KEY (product_id, store_code)
  REFERENCES products (id, store_code)
  ON DELETE CASCADE;

COMMIT;
