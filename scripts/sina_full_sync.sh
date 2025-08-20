#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${SINALITE_CLIENT_ID:?SINALITE_CLIENT_ID is required}"
: "${SINALITE_CLIENT_SECRET:?SINALITE_CLIENT_SECRET is required}"

export SINALITE_AUDIENCE="${SINALITE_AUDIENCE:-https://apiconnect.sinalite.com}"
export SINALITE_API_BASE="${SINALITE_API_BASE:-https://api.sinaliteuppy.com}"
export STORE_CODE="${STORE_CODE:-9}"
export IDS_FILE="${IDS_FILE:-src/product_ids.txt}"

echo "👉 Using:"
echo "   API_BASE   = $SINALITE_API_BASE"
echo "   AUDIENCE   = $SINALITE_AUDIENCE"
echo "   STORE_CODE = $STORE_CODE"
echo "   IDS_FILE   = $IDS_FILE"

echo
echo "🛠  Applying schema…"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/db/sinalite_schema.sql
echo "✅ Schema ready"

echo
echo "🚚 Syncing products…"
node scripts/sina_sync.mjs
