#!/usr/bin/env python3

import requests
import csv
import os
import re
from pathlib import Path
from collections import defaultdict
from time import sleep
from urllib3.exceptions import InsecureRequestWarning
import urllib3

# === Disable SSL warnings ===
urllib3.disable_warnings(InsecureRequestWarning)

# === Config ===
CLIENT_ID = "JarBGsyG2zC4vRFTjLEi4TDbQrXUVEzr"
CLIENT_SECRET = "L292AtithgbZWAuo4UZcQXdG0s7I-TJphyaWCJKA95YpURyZGH1Qh3Ri-YauVdkJ"
AUTH_URL = "https://api.sinaliteuppy.com/auth/token"
API_BASE = "https://api.sinaliteuppy.com"
STORE_CODE = "en_us"
OUTPUT_DIR = Path("table_data/sinalite_api_export")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# === Clean old product CSVs ===
for old_file in OUTPUT_DIR.glob("products_*.csv"):
    try:
        old_file.unlink()
    except Exception as e:
        print(f"⚠️  Couldn't delete {old_file.name}: {e}")

# === Utilities ===

def safe_writerow(writer, row, allowed_fields):
    clean_row = {key: row.get(key, "") for key in allowed_fields}
    writer.writerow(clean_row)

def clean_filename(name: str) -> str:
    return re.sub(r"[^\w\-]+", "_", name.strip().lower())

# === Auth ===
def get_access_token():
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "audience": "https://apiconnect.sinalite.com",
        "grant_type": "client_credentials"
    }
    headers = {"Content-Type": "application/json"}
    res = requests.post(AUTH_URL, json=payload, headers=headers, verify=False)
    res.raise_for_status()
    return res.json()["access_token"]

# === Fetch all products ===
def fetch_product_list(token):
    res = requests.get(f"{API_BASE}/product", headers={"authorization": f"Bearer {token}"}, verify=False)
    res.raise_for_status()
    return res.json()

# === Fetch detailed product data ===
def fetch_product_detail(product_id, token):
    url = f"{API_BASE}/product/{product_id}/{STORE_CODE}"
    res = requests.get(url, headers={"authorization": f"Bearer {token}"}, verify=False)
    res.raise_for_status()
    return res.json()

# === Main sync logic ===
def run_sync():
    token = get_access_token()
    print("🔐 Authenticated successfully.")

    products = fetch_product_list(token)
    print(f"📦 Found {len(products)} products from API.")

    by_category = defaultdict(list)
    skipped = []

    for product in products:
        try:
            print(f"➡️  Fetching product {product['id']}: {product['name']}")
            detail = fetch_product_detail(product["id"], token)

            entry = {
                "id": product["id"],
                "sku": product.get("sku", ""),
                "name": product.get("name", ""),
                "category": product.get("category", ""),
                "options": str(detail[0]),
                "pricing": str(detail[1]),
                "metadata": str(detail[2])
            }

            cat_slug = clean_filename(product["category"])
            by_category[cat_slug].append(entry)

            sleep(0.25)  # prevent rate-limiting
        except Exception as e:
            print(f"⚠️  Failed to fetch product {product.get('id')}: {e}")
            skipped.append(product)

    # === Write out files ===
    for category, rows in by_category.items():
        file_path = OUTPUT_DIR / f"products_{category}.csv"
        fieldnames = ["id", "sku", "name", "category", "options", "pricing", "metadata"]
        with open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for r in rows:
                safe_writerow(writer, r, fieldnames)
        print(f"✅ Wrote {len(rows)} products to {file_path.name}")

    # === Skipped log ===
    if skipped:
        skipped_path = OUTPUT_DIR / "skipped_products.csv"
        with open(skipped_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["id", "name", "sku", "category"])
            writer.writeheader()
            for r in skipped:
                writer.writerow({
                    "id": r.get("id", ""),
                    "name": r.get("name", ""),
                    "sku": r.get("sku", ""),
                    "category": r.get("category", "")
                })
        print(f"⚠️  Skipped {len(skipped)} products — see skipped_products.csv")
    else:
        print("🎉 All products fetched successfully!")

# === Run ===
if __name__ == "__main__":
    run_sync()
