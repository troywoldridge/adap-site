import os
import csv
import json
import sys
import psycopg2
from psycopg2 import sql
from slugify import slugify
from pathlib import Path
from dotenv import load_dotenv

# Fix large CSV fields
csv.field_size_limit(sys.maxsize)

# Load .env file
load_dotenv()

DB_CONFIG = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", 5432)),
}

BASE_DIR = Path("/home/twoldridge/adap-site/table_data/sinalite_categorized_export")

def parse_json_safe(raw_str):
    if not raw_str or raw_str.strip() in {"", "null", "None"}:
        return None
    try:
        return json.loads(raw_str)
    except json.JSONDecodeError:
        return None

def get_or_create_category(cur, category_name):
    cur.execute("SELECT id FROM categories WHERE name = %s", (category_name,))
    result = cur.fetchone()
    if result:
        return result[0]
    slug = slugify(category_name)
    cur.execute("INSERT INTO categories (id, name, slug) VALUES (%s, %s, %s) RETURNING id", (slug, category_name, slug))
    print(f"🆕 Created category: {category_name}")
    return slug

def get_or_create_subcategory_id(cur, category_id, subcategory_name):
    slug = slugify(subcategory_name)
    cur.execute(
        "SELECT id FROM subcategories WHERE category_id = %s AND slug = %s",
        (category_id, slug)
    )
    result = cur.fetchone()
    if result:
        return result[0]

    cur.execute(
        "INSERT INTO subcategories (name, category_id, slug) VALUES (%s, %s, %s) RETURNING id",
        (subcategory_name, category_id, slug)
    )
    subcat_id = cur.fetchone()[0]
    print(f"🆕 Created subcategory: {subcategory_name} under category: {category_id}")
    return subcat_id



def process_csv_file(csv_path, cur, inserted_count, updated_count, log):
    category_name = csv_path.parent.name
    subcategory_name = csv_path.stem

    category_id = get_or_create_category(cur, category_name)
    subcategory_id = get_or_create_subcategory_id(cur, category_id, subcategory_name)

    with open(csv_path, newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, 2):
            try:
                name = row["name"].strip()
                slug = slugify(name)
                sku = row["sku"].strip()
                sinalite_id = row.get("id", "").strip()
                options_json = parse_json_safe(row.get("options", ""))
                pricing_json = parse_json_safe(row.get("pricing", ""))
                metadata_json = parse_json_safe(row.get("metadata", ""))

                cur.execute("SELECT 1 FROM products WHERE sku = %s", (sku,))
                exists = cur.fetchone()

                cur.execute(
                    """
                    INSERT INTO products (name, slug, sku, sinalite_id, category, subcategory_id, options, pricing, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (sku) DO UPDATE SET
                        name = EXCLUDED.name,
                        slug = EXCLUDED.slug,
                        sinalite_id = EXCLUDED.sinalite_id,
                        category = EXCLUDED.category,
                        subcategory_id = EXCLUDED.subcategory_id,
                        options = EXCLUDED.options,
                        pricing = EXCLUDED.pricing,
                        metadata = EXCLUDED.metadata
                    """,
                    (
                        name,
                        slug,
                        sku,
                        sinalite_id,
                        category_id,
                        subcategory_id,
                        json.dumps(options_json) if options_json else None,
                        json.dumps(pricing_json) if pricing_json else None,
                        json.dumps(metadata_json) if metadata_json else None,
                    )
                )

                if exists:
                    updated_count += 1
                    log["updated"].append(sku)
                else:
                    inserted_count += 1
                    log["inserted"].append(sku)

            except Exception as e:
                log["skipped"].append((csv_path.name, row_num, str(e)))

    return inserted_count, updated_count

def truncate_tables(cur):
    cur.execute("TRUNCATE TABLE products CASCADE")
    cur.execute("TRUNCATE TABLE subcategories CASCADE")
    cur.execute("TRUNCATE TABLE categories CASCADE")
    print("🧹 Truncated all product, subcategory, and category tables.")

def main():
    print(f"📂 Scanning: {BASE_DIR}")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    truncate_tables(cur)  # Clear old data before insert

    inserted = 0
    updated = 0
    file_count = 0
    log = {
        "inserted": [],
        "updated": [],
        "skipped": []
    }

    # rest of your loop here...


    for dirpath, _, filenames in os.walk(BASE_DIR):
        for file in filenames:
            if file.endswith(".csv"):
                csv_path = Path(dirpath) / file
                print(f"📄 Processing: {csv_path}")
                inserted, updated = process_csv_file(csv_path, cur, inserted, updated, log)
                file_count += 1

    conn.commit()
    cur.close()
    conn.close()

    print("\n✅ Import Summary")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"📦 Files processed:   {file_count}")
    print(f"🆕 Products inserted: {len(log['inserted'])}")
    print(f"🔁 Products updated:  {len(log['updated'])}")
    print(f"⚠️ Skipped rows:      {len(log['skipped'])}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    if log["skipped"]:
        print("\n⚠️  Skipped Rows:")
        for file, row, reason in log["skipped"]:
            print(f"• {file}, row {row}: {reason}")

    if log["inserted"]:
        print("\n🆕 Inserted SKUs:")
        print(", ".join(log["inserted"][:10]) + (" ..." if len(log["inserted"]) > 10 else ""))

    if log["updated"]:
        print("\n🔁 Updated SKUs:")
        print(", ".join(log["updated"][:10]) + (" ..." if len(log["updated"]) > 10 else ""))

if __name__ == "__main__":
    main()

