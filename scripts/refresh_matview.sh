#!/usr/bin/env bash
set -euo pipefail

# ---------- CONFIG ----------
PG_DB="${PG_DB:-adap}"
PG_USER="${PG_USER:-troy}"
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PSQL="psql -U $PG_USER -d $PG_DB -h $PG_HOST -p $PG_PORT -qAt"
BATCH_SIZE=1000
LOGFILE="./logs/refresh_matview_chunked_$(date +%Y%m%d_%H%M%S).log"

mkdir -p ./logs

timestamp() { date +"%Y-%m-%d %H:%M:%S"; }

echo "==== [$(timestamp)] Starting chunked materialized view rebuild ====" | tee -a "$LOGFILE"

# 1. Gather product ID ranges
echo "[$(timestamp)] Analyzing base tables for fresh planner stats..." | tee -a "$LOGFILE"
$PSQL -c "ANALYZE products;" >> "$LOGFILE" 2>&1
$PSQL -c "ANALYZE pricing;" >> "$LOGFILE" 2>&1
$PSQL -c "ANALYZE product_option_hashes;" >> "$LOGFILE" 2>&1
$PSQL -c "ANALYZE images;" >> "$LOGFILE" 2>&1

# 2. Prepare staging / temp table
echo "[$(timestamp)] Dropping and recreating temporary unlogged staging table product_denorm_tmp" | tee -a "$LOGFILE"
$PSQL <<'SQL' >> "$LOGFILE" 2>&1
DROP MATERIALIZED VIEW IF EXISTS product_denorm_tmp;
CREATE UNLOGGED TABLE IF NOT EXISTS product_denorm_tmp (
  product_id integer,
  product_uuid uuid,
  sku text,
  product_name text,
  product_category text,
  enabled boolean,
  pricing_hash text,
  pricing_value text,
  option_chain text,
  option_hash text,
  image_id integer,
  image_url text,
  variant text,
  alt text
);
TRUNCATE product_denorm_tmp;
SQL

# 3. Chunked population
echo "[$(timestamp)] Starting chunked population (batch size = $BATCH_SIZE)" | tee -a "$LOGFILE"

# Get total product count to drive batching
TOTAL_PRODUCTS=$($PSQL -t -c "SELECT COUNT(*) FROM products;" | tr -d ' ')
echo "[$(timestamp)] Total products: $TOTAL_PRODUCTS" | tee -a "$LOGFILE"

# We'll iterate by offset to avoid large IN lists
offset=0
while [ "$offset" -lt "$TOTAL_PRODUCTS" ]; do
  echo "[$(timestamp)] Processing products offset=$offset (next $BATCH_SIZE)" | tee -a "$LOGFILE"

  $PSQL <<SQL >> "$LOGFILE" 2>&1
WITH chunk AS (
  SELECT id FROM products
  ORDER BY id
  OFFSET $offset
  LIMIT $BATCH_SIZE
)
INSERT INTO product_denorm_tmp
SELECT
  p.id AS product_id,
  p.canonical_uuid AS product_uuid,
  p.sku,
  p.name AS product_name,
  p.category AS product_category,
  p.enabled,
  pr.hash AS pricing_hash,
  pr.value AS pricing_value,
  poh.option_chain,
  poh.hash AS option_hash,
  i.id AS image_id,
  i.image_url,
  i.variant,
  i.alt
FROM chunk c
JOIN products p ON p.id = c.id
LEFT JOIN pricing pr ON pr.product_id = p.id
LEFT JOIN product_option_hashes poh ON poh.product_id = p.id
LEFT JOIN images i ON i.product_id = p.id;
SQL

  offset=$((offset + BATCH_SIZE))
done

# 4. Swap into real materialized view
echo "[$(timestamp)] Swapping staging into materialized view" | tee -a "$LOGFILE"
$PSQL <<'SQL' >> "$LOGFILE" 2>&1
-- Drop existing matview and replace from the staging table
DROP MATERIALIZED VIEW IF EXISTS product_denorm;
CREATE MATERIALIZED VIEW product_denorm AS
SELECT * FROM product_denorm_tmp;

-- Ensure unique index to allow safe concurrent refreshes later
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_denorm_unique
  ON product_denorm (product_id, option_chain, pricing_hash, image_id);
SQL

# 5. Refresh confirmation
echo "[$(timestamp)] Final counts and sampling:" | tee -a "$LOGFILE"
$PSQL -c "SELECT COUNT(*) AS total_rows FROM product_denorm;" >> "$LOGFILE" 2>&1
$PSQL -c "SELECT product_uuid, product_name, pricing_hash, option_chain, image_id FROM product_denorm LIMIT 5;" >> "$LOGFILE" 2>&1

echo "==== [$(timestamp)] Done chunked rebuild ====" | tee -a "$LOGFILE"
echo "Log saved to $LOGFILE"
