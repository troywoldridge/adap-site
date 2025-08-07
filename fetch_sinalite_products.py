import os
import certifi
os.environ['SSL_CERT_FILE'] = certifi.where()
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import json

# ---- Config ----
CLIENT_ID = "JarBGsyG2zC4vRFTjLEi4TDbQrXUVEzr"
CLIENT_SECRET = "L292AtithgbZWAuo4UZcQXdG0s7I-TJphyaWCJKA95YpURyZGH1Qh3Ri-YauVdkJ"
AUDIENCE = "https://apiconnect.sinalite.com"
API_BASE = "https://api.sinaliteuppy.com"

def get_token():
    url = f"{API_BASE}/auth/token"
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "audience": AUDIENCE,
        "grant_type": "client_credentials"
    }
    res = requests.post(url, json=payload, verify=False)
    res.raise_for_status()
    data = res.json()
    return f"{data['token_type']} {data['access_token']}"

def get_products(token):
    url = f"{API_BASE}/product"
    headers = {"Authorization": token}
    res = requests.get(url, headers=headers, verify=False)
    res.raise_for_status()
    return res.json()

def save_to_json(products, filename):
    simplified = [
        {
            "id": p["id"],
            "sku": p["sku"],
            "name": p["name"],
            "category": p["category"],
            "enabled": p["enabled"]
        }
        for p in products
    ]
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(simplified, f, indent=2)
    print(f"Saved {len(simplified)} products to {filename}")

if __name__ == "__main__":
    token = get_token()
    products = get_products(token)
    save_to_json(products, "./sinalite_product_map.json")
