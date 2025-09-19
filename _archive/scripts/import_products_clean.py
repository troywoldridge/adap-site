import os
import csv
import json
import psycopg2
import hashlib
import logging
import re
import sys
from pathlib import Path
from datetime import datetime

# ---------- CONFIG ----------
DEBUG_MODE = True
DATA_DIR = "/home/twoldridge/adap-site/table_data/sinalite_categorized_export"

DB_CONFIG = {
    "dbname": "adap",
    "user": "troy",
    "password": "",
    "host": "localhost",
    "port": 5432,
}

# ---------- LOGGING ----------
logfile = f"/home/twoldridge/adap-site/logs/import_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
os.makedirs(os.path.dirname(logfile), exist_ok=True)

logging.basicConfig(
    level=logging.DEBUG if DEBUG_MODE else logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    handlers=[
        logging.FileHandler(logfile),
        logging.StreamHandler(sys.stdout)
    ]
)

# ---------- JSON FIXER ----------
def fix_json_string(bad_json_str):
    try:
        # Replace single quotes with double quotes, strip trailing commas
        fixed = bad_json_str.strip().replace("'", '"')
        fixed = re.sub(r",\s*}", "}", fixed)
        fixed = re.sub(r",\s*]", "]", fixed)
        return json.loads(fixed)
    except Exception as e:
        logging.warning(f"⚠️ JSON decode failed: {e} → {bad_json_str[:200]}...")
        return None

# ---------- DB CONNECTION ----------
try:
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    cur = conn.cursor()
except Exception as e:
    logging.critical(f"❌ Failed to connect to database: {e}")
    sys.exit(1)

# ---------- INSERT HELPERS ----------
def insert_product(row, filepath):
    try:
        product_id = int(row['product_id'])
        name = row['name']
        description = row.get('description', '')
        category = row.get('category_slug')
        subcategory = row.get('subcategory_slug')
        slug = row['slug']
        images = fix_json_string(row.get('images', '[]'))
        if images is None:
            images = []

        cur.execute("""
            INSERT INTO products (id, name, description, slug, category_slug, subcategory_slug, images)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING;
        """, (product_id, name, description, slug, category, subcategory, json.dumps(images)))
        return product_id

    except Exception as e:
        logging.error(f"❌ Product insert failed for {row.get('name')} in {filepath}: {e}")
        return None

def insert_options(product_id, options_json, filepath):
    try:
        if not options_json:
            return
        options = fix_json_string(options_json)
        if not options:
            return
        for group_id, group in enumerate(options):
            for opt_id, opt in enumerate(group.get('options', [])):
                cur.execute("""
                    INSERT INTO options (group_id, option_id, name, hidden, product_id)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING;
                """, (
                    group_id,
                    opt_id,
                    opt.get("name"),
                    opt.get("hidden", False),
                    product_id
                ))
    except Exception as e:
        logging.error(f"❌ Options insert failed for product {product_id} in {filepath}: {e}")

def insert_pricing(product_id, pricing_json, filepath):
    try:
        if not pricing_json:
            return
        pricing = fix_json_string(pricing_json)
        if not pricing:
            return

        for price in pricing:
            cur.execute("""
                INSERT INTO pricing (product_id, run_size, size, price, markup, value)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (
                product_id,
                price.get("run_size"),
                price.get("size"),
                price.get("price", 0),
                price.get("markup", 0),
                price.get("value", 0)
            ))
    except Exception as e:
        logging.error(f"❌ Pricing insert failed for product {product_id} in {filepath}: {e}")

# ---------- MAIN LOOP ----------
def process_csv_file(csv_path):
    count = 0
    with open(csv_path, newline='', encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            product_id = insert_product(row, csv_path)
            if product_id:
                insert_options(product_id, row.get("options", "[]"), csv_path)
                insert_pricing(product_id, row.get("pricing", "[]"), csv_path)
                count += 1
    logging.info(f"✅ Processed {count} products from {csv_path}")

def import_all():
    logging.info("🚀 Starting import")
    for root, _, files in os.walk(DATA_DIR):
        for file in files:
            if file.endswith(".csv"):
                process_csv_file(os.path.join(root, file))
    logging.info("✅ Import complete.")

if __name__ == "__main__":
    import_all()
