-- ===========================================
-- SinaLite local catalog — structural schema
-- Safe on existing DB; no PK drops
-- All new/changed objects owned by: admin
-- ===========================================

BEGIN;

-- ============ PRODUCTS ============

-- 1) Ensure columns exist
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS store_code SMALLINT,
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Make store_code not null with default
ALTER TABLE products
  ALTER COLUMN store_code SET DEFAULT 9;

UPDATE products
   SET store_code = 9
 WHERE store_code IS NULL;

ALTER TABLE products
  ALTER COLUMN store_code SET NOT NULL;

-- 2) Create a composite UNIQUE (id, store_code) alongside your existing products_pkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'products'::regclass
       AND contype  = 'u'
       AND conname  = 'ux_products_id_store'
  )
  THEN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ux_products_id_store_idx') THEN
      EXECUTE 'CREATE UNIQUE INDEX ux_products_id_store_idx ON products (id, store_code)';
    END IF;
    EXECUTE 'ALTER TABLE products ADD CONSTRAINT ux_products_id_store UNIQUE USING INDEX ux_products_id_store_idx';
  END IF;
END
$$;

-- Ownership
ALTER TABLE products OWNER TO admin;
-- The index might already exist or be name-equivalent; ALTER INDEX IF EXISTS is safe
ALTER INDEX IF EXISTS ux_products_id_store_idx OWNER TO admin;
ALTER TABLE products ALTER COLUMN meta SET DEFAULT '{}'::jsonb;

-- ============ PRODUCT OPTION GROUPS ============

CREATE TABLE IF NOT EXISTS product_option_groups (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT    NOT NULL,
  store_code  SMALLINT  NOT NULL DEFAULT 9,
  group_key   TEXT      NOT NULL,   -- e.g. 'size', 'qty', 'Stock'
  group_label TEXT,                 -- optional pretty label
  meta        JSONB     NOT NULL DEFAULT '{}'::jsonb
);

-- Ensure columns exist (for legacy tables)
ALTER TABLE product_option_groups
  ADD COLUMN IF NOT EXISTS store_code  SMALLINT  NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS group_key   TEXT,
  ADD COLUMN IF NOT EXISTS group_label TEXT,
  ADD COLUMN IF NOT EXISTS meta        JSONB     NOT NULL DEFAULT '{}'::jsonb;

-- Unique: one group per product/store/key
CREATE UNIQUE INDEX IF NOT EXISTS ux_pog_product_store_key
  ON product_option_groups (product_id, store_code, group_key);

-- Recreate FK to composite key
ALTER TABLE product_option_groups DROP CONSTRAINT IF EXISTS product_option_groups_product_fk;
ALTER TABLE product_option_groups
  ADD CONSTRAINT product_option_groups_product_fk
  FOREIGN KEY (product_id, store_code) REFERENCES products (id, store_code) ON DELETE CASCADE;

-- Ownership
ALTER TABLE product_option_groups OWNER TO admin;
ALTER INDEX IF EXISTS ux_pog_product_store_key OWNER TO admin;

-- ============ PRODUCT OPTIONS ============

CREATE TABLE IF NOT EXISTS product_options (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT    NOT NULL,
  store_code   SMALLINT  NOT NULL DEFAULT 9,
  group_key    TEXT      NOT NULL,
  option_id    BIGINT    NOT NULL,     -- SinaLite option ID
  option_name  TEXT      NOT NULL,
  hidden       SMALLINT  NOT NULL DEFAULT 0,
  sort_index   INTEGER,
  meta         JSONB     NOT NULL DEFAULT '{}'::jsonb
);

-- Ensure columns exist (for legacy tables)
ALTER TABLE product_options
  ADD COLUMN IF NOT EXISTS store_code  SMALLINT NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS group_key   TEXT,
  ADD COLUMN IF NOT EXISTS option_id   BIGINT,
  ADD COLUMN IF NOT EXISTS option_name TEXT,
  ADD COLUMN IF NOT EXISTS hidden      SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_index  INTEGER,
  ADD COLUMN IF NOT EXISTS meta        JSONB    NOT NULL DEFAULT '{}'::jsonb;

-- De-dupe within product/store/group by option_id
CREATE UNIQUE INDEX IF NOT EXISTS ux_po_product_store_group_option
  ON product_options (product_id, store_code, group_key, option_id);

-- FKs
ALTER TABLE product_options DROP CONSTRAINT IF EXISTS product_options_product_fk;
ALTER TABLE product_options
  ADD CONSTRAINT product_options_product_fk
  FOREIGN KEY (product_id, store_code) REFERENCES products (id, store_code) ON DELETE CASCADE;

-- Optional FK to groups (helps integrity)
ALTER TABLE product_options DROP CONSTRAINT IF EXISTS product_options_group_fk;
ALTER TABLE product_options
  ADD CONSTRAINT product_options_group_fk
  FOREIGN KEY (product_id, store_code, group_key)
  REFERENCES product_option_groups (product_id, store_code, group_key)
  ON DELETE CASCADE;

-- Ownership
ALTER TABLE product_options OWNER TO admin;
ALTER INDEX IF EXISTS ux_po_product_store_group_option OWNER TO admin;

-- ============ PRODUCT PRICING META (hash/value table) ============

CREATE TABLE IF NOT EXISTS product_pricing_meta (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT    NOT NULL,
  store_code  SMALLINT  NOT NULL DEFAULT 9,
  hash        TEXT      NOT NULL,
  value       TEXT,
  markup      NUMERIC,
  meta        JSONB     NOT NULL DEFAULT '{}'::jsonb
);

-- Ensure columns for legacy
ALTER TABLE product_pricing_meta
  ADD COLUMN IF NOT EXISTS store_code SMALLINT NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS hash       TEXT,
  ADD COLUMN IF NOT EXISTS value      TEXT,
  ADD COLUMN IF NOT EXISTS markup     NUMERIC,
  ADD COLUMN IF NOT EXISTS meta       JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Unique per product/store hash
CREATE UNIQUE INDEX IF NOT EXISTS ux_ppm_product_store_hash
  ON product_pricing_meta (product_id, store_code, hash);

-- FKs
ALTER TABLE product_pricing_meta DROP CONSTRAINT IF EXISTS product_pricing_meta_product_fk;
ALTER TABLE product_pricing_meta
  ADD CONSTRAINT product_pricing_meta_product_fk
  FOREIGN KEY (product_id, store_code) REFERENCES products (id, store_code) ON DELETE CASCADE;

-- Ownership
ALTER TABLE product_pricing_meta OWNER TO admin;
ALTER INDEX IF EXISTS ux_ppm_product_store_hash OWNER TO admin;

-- ============ VISUAL CHECKS ============

-- Show that our unique/PK anchors exist (should each be 1)
DO $$
DECLARE
  c_products int;
  c_pog int;
  c_po int;
  c_ppm int;
BEGIN
  SELECT COUNT(*) INTO c_products FROM pg_constraint WHERE conrelid='products'::regclass AND (contype='p' OR (contype='u' AND conname='ux_products_id_store'));
  SELECT COUNT(*) INTO c_pog       FROM pg_indexes    WHERE tablename='product_option_groups'  AND indexname='ux_pog_product_store_key';
  SELECT COUNT(*) INTO c_po        FROM pg_indexes    WHERE tablename='product_options'        AND indexname='ux_po_product_store_group_option';
  SELECT COUNT(*) INTO c_ppm       FROM pg_indexes    WHERE tablename='product_pricing_meta'   AND indexname='ux_ppm_product_store_hash';
  RAISE NOTICE 'anchors => products:% pog:% po:% ppm:%', c_products, c_pog, c_po, c_ppm;
END $$;

COMMIT;
