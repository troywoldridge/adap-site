#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d ".open-next" ]; then
  echo "ERROR: .open-next not found. Run: pnpm dlx open-next@3.0.4 build"
  exit 1
fi

# Try to find the worker entry file that open-next generates
MAIN=""
CANDIDATES=(
  ".open-next/worker/index.mjs"
  ".open-next/worker/index.js"
  ".open-next/worker.mjs"
  ".open-next/worker.js"
  ".open-next/server/worker.mjs"
  ".open-next/server/worker.js"
)

for c in "${CANDIDATES[@]}"; do
  if [ -f "$c" ]; then
    MAIN="$c"
    break
  fi
done

if [ -z "$MAIN" ]; then
  # fallback: first .mjs or .js file under .open-next that looks like worker entry
  MAIN="$(find .open-next -maxdepth 3 -type f \( -name 'index.mjs' -o -name 'worker.mjs' -o -name 'worker.js' -o -name 'index.js' \) | head -n 1 || true)"
fi

if [ -z "$MAIN" ] || [ ! -f "$MAIN" ]; then
  echo "ERROR: Could not locate open-next worker entrypoint under .open-next/"
  echo "Try: find .open-next -maxdepth 3 -type f | head -n 50"
  exit 1
fi

# Assets dir (open-next usually generates assets here)
ASSETS_DIR=""
if [ -d ".open-next/assets" ]; then
  ASSETS_DIR=".open-next/assets"
elif [ -d ".open-next/static" ]; then
  ASSETS_DIR=".open-next/static"
fi

NAME="${1:-adapnow}"

# Write wrangler.jsonc
cat > wrangler.jsonc <<JSON
{
  "name": "${NAME}",
  "compatibility_date": "2026-02-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "${MAIN}"$([ -n "$ASSETS_DIR" ] && printf ',
  "assets": { "directory": "%s" }' "$ASSETS_DIR" || true)
}
JSON

echo "✅ wrote wrangler.jsonc"
echo "   name:  $NAME"
echo "   main:  $MAIN"
if [ -n "$ASSETS_DIR" ]; then
  echo "   assets: $ASSETS_DIR"
else
  echo "   assets: (none detected)"
fi
