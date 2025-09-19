import csv
import psycopg2
import os
from dotenv import load_dotenv

CSV_PATH = "/home/twoldridge/adap-site/all_extracted_options.csv"
csv.field_size_limit(524288000)  # handle large fields
load_dotenv()

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )

def parse_hidden(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ["true", "1", "yes"]

def import_options():
    inserted = 0
    skipped = 0
    with get_connection() as conn:
        with conn.cursor() as cur:
            with open(CSV_PATH, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    product_id = row.get("product_id", "").strip()
                    sku = row.get("sku", "").strip()  # optional
                    option_id = row.get("option_id", "").strip()  # optional
                    group = row.get("group", "").strip()
                    name = row.get("name", "").strip()
                    hidden = parse_hidden(row.get("hidden", "false"))

                    # Skip rows missing mandatory fields
                    if not product_id or not group or not name:
                        skipped += 1
                        continue

                    try:
                        cur.execute("""
                            INSERT INTO options (product_id, sku, option_id, "group", name, hidden)
                            VALUES (%s, %s, %s, %s, %s, %s)
                        """, (product_id, sku or None, option_id or None, group, name, hidden))
                        inserted += 1
                    except Exception as e:
                        print(f"❌ Failed to insert row: {row} — {e}")
                        skipped += 1

        conn.commit()
    print(f"✅ Done. Inserted: {inserted}, Skipped: {skipped}")

if __name__ == "__main__":
    import_options()
