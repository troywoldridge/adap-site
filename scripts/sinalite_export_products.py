#!/usr/bin/env python3

import pandas as pd
import csv
from pathlib import Path
from collections import defaultdict
from difflib import get_close_matches
import json

# === Paths ===
INPUT_FILE = Path("products_complete_cleaned.csv")
OUTPUT_DIR = Path("table_data/exported_products")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SKIPPED_FILE = OUTPUT_DIR / "skipped_products.csv"
MATCH_LOG_FILE = OUTPUT_DIR / "matched_products_log.csv"

# === Load CSV w/ max leniency ===
df = pd.read_csv(
    INPUT_FILE,
    header=None,
    engine="python",
    on_bad_lines='skip',
    quoting=3,
    dtype=str
)

print("✅ Loaded CSV successfully")
print(df.head(2))
print(f"Total rows: {df.shape[0]}")
print(f"Total columns: {df.shape[1]}")

df.columns = [
    "id", "raw_name", "slug", "created_at", "updated_at", "seo_slug", "uuid",
    "options", "pricing"
] + [f"extra_{i}" for i in range(len(df.columns) - 9)]

# === Import structured product map ===
try:
    from sinalite_product_structure import product_structure
except ImportError:
    print("❌ ERROR: Missing `sinalite_product_structure.py`. Make sure it exists in your PYTHONPATH.")
    exit(1)

# === Lookup map for fast matching ===
product_lookup = {}
for category, subcats in product_structure.items():
    for subcat, names in subcats.items():
        for name in names:
            key = name.strip().lower()
            product_lookup[key] = {
                "category": category,
                "subcategory": subcat,
                "product_name": name
            }

# === Helper for semi-broken JSON strings ===
def clean_json_like(value):
    if not isinstance(value, str):
        return ""
    cleaned = value.replace("'", '"').replace("\n", " ").replace("\r", " ").strip()
    try:
        # Test if it parses
        json.loads(cleaned)
        return cleaned
    except json.JSONDecodeError:
        return cleaned  # still return it even if not valid JSON

# === Buffers ===
csv_buffers = defaultdict(list)
match_log = []
skipped = []

# === Matching pass ===
for _, row in df.iterrows():
    raw_name_original = row["raw_name"]
    raw_name = raw_name_original.strip().lower()

    match_type = "exact"
    match = product_lookup.get(raw_name)

    if not match:
        # Try fuzzy matching if exact fails
        close = get_close_matches(raw_name, product_lookup.keys(), n=1, cutoff=0.83)
        if close:
            match = product_lookup[close[0]]
            match_type = "fuzzy"

    if match:
        entry = {
            "product_id": row.get("uuid", ""),
            "slug": row.get("slug", ""),
            "seo_slug": row.get("seo_slug", ""),
            "name": raw_name_original,
            "subcategory": match["subcategory"],
            "product_name": match["product_name"],
            "options": clean_json_like(row.get("options", "")),
            "pricing": clean_json_like(row.get("pricing", ""))
        }

        csv_buffers[match["category"]].append(entry)
        match_log.append({
            "input_raw_name": raw_name_original,
            "matched_name": match["product_name"],
            "match_type": match_type,
            "category": match["category"],
            "subcategory": match["subcategory"]
        })
    else:
        skipped.append({
            "raw_name": raw_name_original,
            "slug": row.get("slug", "")
        })

# === Write categorized CSVs ===
for category, rows in csv_buffers.items():
    out_file = OUTPUT_DIR / f"products_{category.lower().replace(' ', '_')}.csv"
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"✅ Wrote {len(rows)} products to {out_file.name}")

# === Write match log ===
if match_log:
    with open(MATCH_LOG_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=match_log[0].keys())
        writer.writeheader()
        writer.writerows(match_log)
    print(f"📘 Match log written to {MATCH_LOG_FILE.name}")

# === Write skipped ===
if skipped:
    with open(SKIPPED_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["raw_name", "slug"])
        writer.writeheader()
        writer.writerows(skipped)
    print(f"⚠️  Skipped {len(skipped)} unmatched products — see {SKIPPED_FILE.name}")
else:
    print("✅ All products matched!")
