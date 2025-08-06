import psycopg2
import re
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DB_CONFIG = dict(
    dbname=os.environ.get("PGDATABASE"),
    user=os.environ.get("PGUSER"),
    password=os.environ.get("PGPASSWORD"),
    host=os.environ.get("PGHOST"),
    port=int(os.environ.get("PGPORT", 5432)),
)

CATEGORY_ASSETS_FILE = "src/lib/categoryAssets.ts"  # Adjust if needed

# ---- DB QUERY ----
def get_slugs(conn, table):
    with conn.cursor() as cur:
        cur.execute(f"SELECT slug FROM {table};")
        return {row[0] for row in cur.fetchall()}

# ---- ASSET PARSING ----
def parse_asset_keys(ts_file, asset_name):
    with open(ts_file, "r") as f:
        content = f.read()
    pattern = re.compile(rf'export const {asset_name}: Record<string, [^>]+> = {{(.*?)}};', re.S)
    m = pattern.search(content)
    if not m:
        print(f"Could not find {asset_name} in {ts_file}")
        return set()
    body = m.group(1)
    keys = set(re.findall(r'"([^"]+)":\s*{', body))
    return keys

def main():
    # --- Connect to DB
    try:
        conn = psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        print(f"DB connection error: {e}")
        return

    db_cat_slugs = get_slugs(conn, "categories")
    db_subcat_slugs = get_slugs(conn, "subcategories")

    asset_cat_slugs = parse_asset_keys(CATEGORY_ASSETS_FILE, "CATEGORY_ASSETS")
    asset_subcat_slugs = parse_asset_keys(CATEGORY_ASSETS_FILE, "SUBCATEGORY_ASSETS")

    print("\n=== Categories ===")
    for slug in sorted(db_cat_slugs):
        if slug not in asset_cat_slugs:
            print(f"⚠️  Missing CATEGORY_ASSETS entry for: \"{slug}\"")
    for slug in sorted(asset_cat_slugs):
        if slug not in db_cat_slugs:
            print(f"❌  Extra/unmatched asset key (not in DB): \"{slug}\"")

    print("\n=== Subcategories ===")
    for slug in sorted(db_subcat_slugs):
        if slug not in asset_subcat_slugs:
            print(f"⚠️  Missing SUBCATEGORY_ASSETS entry for: \"{slug}\"")
    for slug in sorted(asset_subcat_slugs):
        if slug not in db_subcat_slugs:
            print(f"❌  Extra/unmatched subcategory asset key: \"{slug}\"")

    print("\nDone.")
    conn.close()

if __name__ == "__main__":
    main()
