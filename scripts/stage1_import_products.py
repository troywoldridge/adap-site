import os
import csv
import json
import time
import sys
from pathlib import Path
from datetime import datetime
import psycopg2

# -------- CONFIG --------
DB_CONFIG = {
    "dbname": "adap",
    "user": "troy",
    "password": "",  # adjust if needed
    "host": "localhost",
    "port": 5432,
}
DATA_DIR = "/home/twoldridge/adap-site/table_data/sinalite_categorized_export"
LOG_FILE = "stage1_product_import.log"

# -------- SETUP --------
csv.field_size_limit(sys.maxsize)
conn = psycopg2.connect(**DB_CONFIG)
conn.autocommit = True
cur = conn.cursor()

def log(message):
    timestamp = datetime.now().strftime("[%Y-%m-%d %H:%M:%S]")
    print(f"{timestamp} {message}")
    with open(LOG_FILE, "a") as f:
        f.write(f"{timestamp} {message}\n")

def clean_json(value):
    if not value:
        return {}
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        try:
            # Try fixing common issues
            value = value.replace("'", '"')
            value = value.replace(",}", "}")
            value = value.replace(",]", "]")
            return json.loads(value)
        except Exception:
            return {}

def insert_product(row):
    try:
        product_id = int(row["id"])
        sku = row["sku"].strip()
        name = row["name"].strip()
        category = row["category"].strip()
        metadata = clean_json(row.get("metadata", ""))

        cur.execute(
            """
            INSERT INTO products (id, sku, name, category, metadata)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING;
            """,
            (product_id, sku, name, category, json.dumps(metadata))
        )
        return True
    except Exception as e:
        log(f"❌ Insert failed for product {row.get('id', 'N/A')}: {e}")
        return False

def process_csv_file(file_path):
    count = 0
    success = 0
    with open(file_path, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            count += 1
            if not all(field in row and row[field].strip() for field in ['id', 'sku', 'name', 'category']):
                log(f"⚠️  Skipping row {count} in {file_path} due to missing fields.")
                continue
            if insert_product(row):
                success += 1
    log(f"✅ Processed {success}/{count} products from {file_path}")

def truncate_products():
    try:
        log("🧨 Truncating products table...")
        cur.execute("TRUNCATE TABLE products RESTART IDENTITY CASCADE;")
        log("✅ Products table truncated.")
    except Exception as e:
        log(f"❌ Failed to truncate products table: {e}")
        sys.exit(1)

def run():
    start = time.time()
    log("🚀 Starting Stage 1: Basic Product Import")
    truncate_products()

    for root, _, files in os.walk(DATA_DIR):
        for file in files:
            if file.endswith(".csv"):
                process_csv_file(os.path.join(root, file))

    elapsed = round(time.time() - start, 2)
    log(f"🏁 Import complete in {elapsed}s.")

if __name__ == "__main__":
    run()
