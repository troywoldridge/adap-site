-- src/db/sinalite_schema.sql
BEGIN;

-- ========= PRODUCTS (isolated) =========
CREATE TABLE IF NOT EXISTS sina_products (
  id           BIGINT    NOT NULL,             -- SinaLite product id
  store_code   SMALLINT  NOT NULL DEFAULT 9,   -- 6 (CA) / 9 (US)
  sku          TEXT,
  name         TEXT,
  category     TEXT,
  enabled      SMALLINT,
  meta         JSONB     NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, store_code)
);

CREATE INDEX IF NOT EXISTS ix_sina_products_category ON sina_products (category);

-- ========= OPTION GROUPS =========
CREATE TABLE IF NOT EXISTS sina_option_groups (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT    NOT NULL,
  store_code   SMALLINT  NOT NULL DEFAULT 9,
  group_key    TEXT      NOT NULL,       -- machine key (e.g. "size","qty","Stock")
  group_label  TEXT,                     -- friendly label if you want it
  meta         JSONB     NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (product_id, store_code, group_key),
  FOREIGN KEY (product_id, store_code) REFERENCES sina_products(id, store_code) ON DELETE CASCADE
);

-- ========= OPTIONS =========
CREATE TABLE IF NOT EXISTS sina_options (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT    NOT NULL,
  store_code   SMALLINT  NOT NULL DEFAULT 9,
  group_key    TEXT      NOT NULL,
  option_id    BIGINT    NOT NULL,       -- SinaLite option id
  option_name  TEXT      NOT NULL,
  hidden       SMALLINT  NOT NULL DEFAULT 0,
  sort_index   INTEGER,
  meta         JSONB     NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (product_id, store_code, group_key, option_id),
  FOREIGN KEY (product_id, store_code) REFERENCES sina_products(id, store_code) ON DELETE CASCADE,
  FOREIGN KEY (product_id, store_code, group_key) REFERENCES sina_option_groups(product_id, store_code, group_key) ON DELETE CASCADE
);

-- ========= PRICING META (hash/value list) =========
CREATE TABLE IF NOT EXISTS sina_pricing_meta (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT    NOT NULL,
  store_code   SMALLINT  NOT NULL DEFAULT 9,
  hash         TEXT      NOT NULL,
  value        TEXT,
  markup       NUMERIC,
  meta         JSONB     NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (product_id, store_code, hash),
  FOREIGN KEY (product_id, store_code) REFERENCES sina_products(id, store_code) ON DELETE CASCADE
);

COMMIT;
