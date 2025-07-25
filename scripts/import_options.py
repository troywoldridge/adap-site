# scripts/import_options.py

import os
import csv
import json
import sys
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
PGSSLMODE = os.getenv("PGSSLMODE", "disable")

CSV_ROOT_DIR = '/home/twoldridge/adap-site/table_data/sinalite_categorized_export'

csv.field_size_limit(sys.maxsize)

# Construct connection string
DB_CONN_STRING = (
    f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} "
    f"password={DB_PASSWORD} sslmode={PGSSLMODE}"
)

def parse_json_field(field):
    try:
        clean_field = field.replace("'", '"').replace("\n", " ").replace("\r", " ").strip()
        return json.loads(clean_field)
    except Exception as e:
        print(f"⚠️ JSON parse failed for field snippet: {field[:80]}... error: {e}")
        return None

def find_csv_files(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.lower().endswith('.csv'):
                full_path = os.path.join(dirpath, filename)
                print(f"Found CSV file: {full_path}")  # debug print
                yield full_path


def main():
    print("🔄 Connecting to DB...")
    conn = psycopg2.connect(DB_CONN_STRING)
    cur = conn.cursor()

    print("🔄 Truncating options and options_groups tables...")
    cur.execute("TRUNCATE TABLE options RESTART IDENTITY CASCADE")
    cur.execute("TRUNCATE TABLE options_groups RESTART IDENTITY CASCADE")
    conn.commit()
    print("✅ Tables truncated.")

    insert_option_rows = []
    option_groups = {}
    skipped_rows = 0
    loaded_options = 0

    print(f"📥 Scanning CSV files for options under {CSV_ROOT_DIR}...")

    for filepath in find_csv_files(CSV_ROOT_DIR):
        print(f"🔍 Reading: {filepath}")
        with open(filepath, mode='r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    product_id = int(row['id'])
                    options_json = parse_json_field(row.get('options', ''))
                    if not options_json:
                        skipped_rows += 1
                        continue

                    for group in options_json:
                        group_id = int(group.get('id', 0))
                        group_name = group.get('group', '').strip()

                        # Deduplicate by composite key (group_id, product_id)
                        group_key = (group_id, product_id)
                        if group_key not in option_groups:
                            option_groups[group_key] = {
                                'id': group_id,
                                'product_id': product_id,
                                'group_name': group_name
                            }

                        for opt in group.get('options', []):
                            option_id = int(opt.get('id', 0))
                            name = opt.get('name', '').strip()
                            hidden = bool(opt.get('hidden', False))
                            value = opt.get('value', '')
                            if value is not None:
                                value = value.strip()
                            insert_option_rows.append(
                                (group_id, option_id, name, hidden, product_id, value)
                            )
                            loaded_options += 1

                except Exception:
                    skipped_rows += 1
                    continue

    print(f"📦 Total options parsed: {loaded_options}")
    print(f"⚠️ Rows skipped due to error/missing: {skipped_rows}")

    # Insert option groups first (deduplicated by id)
    if option_groups:
        print("📝 Inserting option groups into options_groups table...")

        # Deduplicate option groups by 'id' (primary key)
        seen_ids = set()
        unique_groups = []
        # Reverse so last occurrence wins
        for g in reversed(option_groups.values()):
            if g['id'] not in seen_ids:
                seen_ids.add(g['id'])
                unique_groups.append((g['id'], g['product_id'], g['group_name']))
        unique_groups.reverse()

        execute_values(
            cur,
            """
            INSERT INTO options_groups (id, product_id, group_name)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET group_name = EXCLUDED.group_name
            """,
            unique_groups,
            page_size=500
        )
        conn.commit()
        print(f"✅ Inserted/updated {len(unique_groups)} option groups.")
    else:
        print("⚠️ No option groups found to insert.")

    # Insert options
    if insert_option_rows:
        print("📝 Inserting options into options table...")
        execute_values(
            cur,
            """
            INSERT INTO options (group_id, option_id, name, hidden, product_id, value)
            VALUES %s
            ON CONFLICT (product_id, group_id, option_id) DO NOTHING
            """,
            insert_option_rows,
            page_size=1000
        )
        conn.commit()
        print(f"✅ Inserted {len(insert_option_rows)} option rows.")
    else:
        print("⚠️ No option rows found to insert.")

    cur.close()
    conn.close()
    print("🎉 Import complete.")

if __name__ == "__main__":
    main()
