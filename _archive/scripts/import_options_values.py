import os
import csv
import json
import psycopg2
from psycopg2.extras import execute_values
from pathlib import Path
from dotenv import load_dotenv

# === CONFIG ===
CSV_DIR = Path("/home/twoldridge/adap-site/table_data/sinalite_categorized_export")
csv.field_size_limit(524288000)  # 500 MB for large fields
load_dotenv()

# === DB CONNECTION ===
def get_connection():
    try:
        return psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
        )
    except Exception as e:
        print(f"❌ DB Connection Error: {e}")
        raise

# === FIND CSV FILES ===
def find_csv_files():
    return list(CSV_DIR.rglob("*.csv"))

# === EXTRACT OPTIONS ===
def extract_options(file_path):
    extracted = []
    with open(file_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                product_id = int(row.get("product_id") or row.get("id") or 0)
                if not product_id:
                    continue  # skip if no product ID

                option_id = int(row.get("option_id") or row.get("id") or 0)
                name = (row.get("option_name") or row.get("name") or "").strip()
                hidden = str(row.get("hidden", "false")).strip().lower() == "true"
                value = (row.get("value") or "").strip()

                # Try to parse value as JSON, otherwise store raw
                try:
                    parsed_value = json.loads(value.replace("'", '"'))
                    value = json.dumps(parsed_value)
                except Exception:
                    pass  # use raw string if parsing fails

                extracted.append((
                    None,  # group_id is skipped
                    option_id,
                    name,
                    hidden,
                    product_id,
                    value
                ))

            except Exception as e:
                print(f"⚠️ Skipping row in {file_path}: {e}")
    return extracted

# === MAIN SCRIPT ===
def main():
    conn = get_connection()
    cursor = conn.cursor()

    print("📁 Scanning all CSV files...")
    csv_files = find_csv_files()
    print(f"📦 Found {len(csv_files)} CSV files")

    all_options = []

    for csv_file in csv_files:
        opts = extract_options(csv_file)
        all_options.extend(opts)

    print(f"📝 Preparing to insert {len(all_options):,} rows into `options`...")

    try:
        execute_values(cursor, """
            INSERT INTO options (group_id, option_id, name, hidden, product_id, value)
            VALUES %s;
        """, all_options)

        conn.commit()
        print("✅ Insert complete! All rows added.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Insert failed: {e}")

    finally:
        cursor.close()
        conn.close()
        print("🔒 Connection closed.")

if __name__ == "__main__":
    main()
