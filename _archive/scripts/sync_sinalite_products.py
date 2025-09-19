import os
import csv
import json
import time
import requests
import psycopg2
from dotenv import load_dotenv
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load environment variables
load_dotenv()

CLIENT_ID = os.getenv("SINALITE_CLIENT_ID")
CLIENT_SECRET = os.getenv("SINALITE_CLIENT_SECRET")
DATABASE_URL = os.getenv("DATABASE_URL")

AUTH_URL = "https://api.sinaliteuppy.com/auth/token"
API_BASE = "https://api.sinaliteuppy.com"
STORE_CODE = "en_us"
CSV_EXPORT_PATH = "synced_products.csv"

RETRY_LIMIT = 3
RETRY_DELAY = 2

def log(msg):
    print(f"[LOG] {msg}")

def retry_request(method, url, **kwargs):
    for attempt in range(1, RETRY_LIMIT + 1):
        try:
            res = method(url, **kwargs)
            res.raise_for_status()
            return res
        except Exception as e:
            log(f"Retry {attempt}/{RETRY_LIMIT} failed: {e}")
            time.sleep(RETRY_DELAY)
    raise Exception(f"Failed after {RETRY_LIMIT} attempts: {url}")

def get_access_token():
    log("Authenticating with Sinalite...")
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "audience": "https://apiconnect.sinalite.com",
        "grant_type": "client_credentials",
    }
    headers = {
        "Content-Type": "application/json",
    }

    response = retry_request(
        requests.post,
        AUTH_URL,
        json=payload,
        headers=headers,
        timeout=10,
        verify=False
    )

    data = response.json()
    if "access_token" not in data or "token_type" not in data:
        raise Exception("Authentication failed. Check your client ID and secret.")

    return f"{data['token_type']} {data['access_token']}"

def fetch_product_list(token):
    log("Fetching product list...")
    headers = {"authorization": token}
    res = retry_request(
        requests.get,
        f"{API_BASE}/product",
        headers=headers,
        verify=False,
        timeout=10
    )
    return res.json()

def fetch_product_details(product_id, token):
    log(f"→ Fetching details for product {product_id}")
    headers = {"authorization": token}
    res = retry_request(
        requests.get,
        f"{API_BASE}/product/{product_id}/{STORE_CODE}",
        headers=headers,
        verify=False,
        timeout=10
    )
    return res.json()

def connect_db():
    return psycopg2.connect(DATABASE_URL)

def sync_products():
    token = get_access_token()
    product_list = fetch_product_list(token)

    with connect_db() as conn, conn.cursor() as cur:
        log("⚠️  Wiping existing products...")
        cur.execute("DELETE FROM products")

        log("Getting existing subcategories...")
        cur.execute("SELECT id, slug FROM subcategories")
        subcat_map = {slug: sid for sid, slug in cur.fetchall()}

        inserted = 0
        csv_rows = []

        for prod in product_list:
            try:
                slug = (
                    prod["category"]
                    .lower()
                    .replace(" ", "-")
                    .replace("/", "-")
                    .replace("&", "and")
                    .replace(",", "")
                )

                subcat_id = subcat_map.get(slug)
                if not subcat_id:
                    log(f"➕ Creating new subcategory: {slug}")
                    cur.execute(
                        "INSERT INTO subcategories (slug, name, category) VALUES (%s, %s, %s) RETURNING id",
                        (slug, prod["category"], "print-products"),
                    )
                    subcat_id = cur.fetchone()[0]
                    subcat_map[slug] = subcat_id

                options, pricing_data, metadata = fetch_product_details(prod["id"], token)

                cur.execute(
                    """
                    INSERT INTO products
                    (sinalite_id, name, sku, slug, options, pricing_data, product_metadata, subcategory_id, category_id, enabled)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        prod["id"],
                        prod["name"],
                        prod["sku"],
                        prod["name"].lower().replace(" ", "-"),
                        json.dumps(options),
                        json.dumps(pricing_data),
                        json.dumps(metadata),
                        subcat_id,
                        "print-products",
                        bool(prod["enabled"]),
                    ),
                )
                csv_rows.append({
                    "id": prod["id"],
                    "name": prod["name"],
                    "sku": prod["sku"],
                    "category": prod["category"]
                })
                inserted += 1

            except Exception as e:
                log(f"❌ Error syncing product {prod['id']}: {e}")

        log(f"✅ {inserted} products inserted.")
        export_to_csv(csv_rows)

def export_to_csv(data):
    log(f"📤 Exporting {len(data)} products to {CSV_EXPORT_PATH}...")
    with open(CSV_EXPORT_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "name", "sku", "category"])
        writer.writeheader()
        for row in data:
            writer.writerow(row)

if __name__ == "__main__":
    try:
        sync_products()
    except Exception as e:
        log(f"Fatal error: {e}")
        exit(1)
