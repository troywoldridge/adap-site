#!/usr/bin/env bash
set -euo pipefail

# ---------- CONFIG ----------
IDS_FILE="${IDS_FILE:-src/product_ids.txt}"
STORE_CODE="${STORE_CODE:-9}"
API_BASE="${SINALITE_API_BASE:-https://api.sinaliteuppy.com}"
AUDIENCE="${SINALITE_AUDIENCE:-https://apiconnect.sinalite.com}"
DB_URL="${DATABASE_URL:-}"

# ---------- ENV CHECKS ----------
echo "👉 Using:"
printf "   API_BASE           = %s\n"  "$API_BASE"
printf "   AUDIENCE           = %s\n"  "$AUDIENCE"
printf "   STORE_CODE         = %s\n"  "$STORE_CODE"
printf "   IDS_FILE           = %s\n"  "$IDS_FILE"
printf "   DATABASE_URL set   = %s\n"  "${DB_URL:+yes}${DB_URL:+" (hidden)"}"

if [[ -z "${SINALITE_CLIENT_ID:-}" || -z "${SINALITE_CLIENT_SECRET:-}" ]]; then
  echo "❌ SINALITE_CLIENT_ID / SINALITE_CLIENT_SECRET are not set in this shell."
  echo "   Export them or load your .env into the shell before running."
  exit 1
fi

# Show safe previews of secrets (first/last chars only)
cid="$SINALITE_CLIENT_ID"; cs="$SINALITE_CLIENT_SECRET"
printf "   CLIENT_ID preview  = %s…%s\n"  "${cid:0:4}" "${cid: -4}"
printf "   CLIENT_SEC preview = %s…%s\n"  "${cs:0:4}"  "${cs: -4}"

# ---------- RUN SYNC (node) ----------
# We purposefully pass env explicitly so the child has them.
node --version
node ./scripts/sina_sync.mjs \
  --api "$API_BASE" \
  --aud "$AUDIENCE" \
  --store "$STORE_CODE" \
  --ids "$IDS_FILE"
