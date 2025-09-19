import json
import psycopg2
import os
from pathlib import Path
from dotenv import load_dotenv

# Load DB creds from .env
load_dotenv()

JSON_INPUT = "parsed_option_blobs.json"

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )

def reset_table():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DROP TABLE IF EXISTS pricing;")
            cur.execute("""
                CREATE TABLE pricing (
                    id SERIAL PRIMARY KEY,
                    category TEXT NOT NULL,
                    product TEXT NOT NULL,
                    row_number INTEGER NOT NULL,
                    hash TEXT NOT NULL,
                    value TEXT NOT NULL,
                    type TEXT NOT NULL,
                    markup INTEGER
                );
            """)
        conn.commit()
    print("🧹 Dropped and recreated pricing table.")

def load_and_insert_data():
    inserted = 0
    with open(JSON_INPUT, "r", encoding="utf-8") as f:
        data = json.load(f)

    with get_connection() as conn:
        with conn.cursor() as cur:
            for entry in data:
                file_path = entry["file"].replace(".csv", "")
                parts = file_path.split("/")
                if len(parts) < 2:
                    print(f"⚠️ Skipping bad file path: {entry['file']}")
                    continue

                category = parts[0]
                product = parts[1]

                cur.execute("""
                    INSERT INTO pricing (category, product, row_number, hash, value, type, markup)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    category,
                    product,
                    entry["row"],
                    entry["hash"],
                    entry["value"],
                    entry["type"],
                    entry.get("markup")
                ))
                inserted += 1
        conn.commit()
    print(f"✅ Inserted {inserted} pricing records.")

if __name__ == "__main__":
    reset_table()
    load_and_insert_data()
