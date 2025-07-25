import os
import psycopg2
import json
import re
import logging
import time
import pandas as pd

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')

DATA_DIR = "/home/twoldridge/adap-site/table_data/sinalite_categorized_export"

DB_CONFIG = {
    "dbname": "adap",
    "user": "troy",
    "password": "",
    "host": "localhost",
    "port": 5432,
}

def clean_json_string(s):
    if not s or not isinstance(s, str):
        return {}
    try:
        return json.loads(s)
    except:
        pass
    try:
        s = s.replace("'", '"')
        s = re.sub(r',\s*}', '}', s)
        s = re.sub(r',\s*]', ']', s)
        return json.loads(s)
    except:
        return {}

def process_rows(cur, rows, filename):
    inserted = 0
    for i, row in enumerate(rows, 1):
        try:
            product_id = int(row.get("id") or 0)
            sku = row.get("sku") or ""
            name = row.get("name") or ""
            category = row.get("category") or ""

            if product_id == 0 or not sku or not name:
                continue

            options = clean_json_string(row.get("options", "{}"))
            pricing = clean_json_string(row.get("pricing", "{}"))
            metadata = clean_json_string(row.get("metadata", "{}"))

            cur.execute("""
                INSERT INTO products (id, sku, name, category, metadata)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (product_id, sku, name, category, json.dumps(metadata)))

            for group, values in options.items():
                for value in values:
                    cur.execute("""
                        INSERT INTO options (product_id, name, value)
                        VALUES (%s, %s, %s)
                        ON CONFLICT DO NOTHING;
                    """, (product_id, group, value))

            for size, runs in pricing.items():
                for run, price_info in runs.items():
                    price = price_info.get("price")
                    markup = price_info.get("markup")
                    if price is None:
                        continue
                    cur.execute("""
                        INSERT INTO pricing (product_id, size, run, value, markup)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING;
                    """, (product_id, size, run, price, markup))

            inserted += 1

        except Exception as e:
            logging.error(f"❌ Insert failed for product at row {i} in {filename}: {e}")
    logging.info(f"✅ Processed {inserted} rows from {filename}")

def process_csv_file(cur, path):
    logging.info(f"🚀 Reading {path} with pandas")
    rows = []
    try:
        rows = pd.read_csv(path, engine='python', dtype=str).to_dict(orient='records')
    except Exception as e:
        logging.error(f"❌ Failed to read CSV {path}: {e}")
        return
    process_rows(cur, rows, os.path.basename(path))

def import_all():
    start = time.time()
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    cur = conn.cursor()
    for root, _, files in os.walk(DATA_DIR):
        for file in files:
            if file.endswith(".csv"):
                process_csv_file(cur, os.path.join(root, file))
    cur.close()
    conn.close()
    logging.info(f"🏁 All imports done in {time.time() - start:.2f}s")

if __name__ == "__main__":
    import_all()
