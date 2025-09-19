import os
import csv
import re
import ast
import json
from pathlib import Path

# Root directory containing nested folders of CSVs
BASE_DIR = Path("/home/twoldridge/adap-site/table_data/sinalite_categorized_export")
OUTPUT_FILE = "parsed_option_blobs.json"

csv.field_size_limit(524288000)  # 500 MB field limit

parsed = []

def classify_value(val):
    val = val.strip()
    if val.startswith('%'):
        return 'percentage'
    if 'x' in val and re.match(r'^(\d+(\.\d+)?\s*x\s*)+\d+(\.\d+)?$', val.lower()):
        return 'dimensions'
    if re.match(r'^-?\d+\.\d+$', val):  # decimal
        return 'money' if float(val) > 1 else 'rate'
    if re.match(r'^-?\d+$', val):  # integer
        return 'integer'
    return 'unknown'

def parse_blob(blob_str):
    try:
        # Try parsing the Python-style list of dicts
        return ast.literal_eval(blob_str)
    except Exception:
        return None

# Recursively find all CSVs in subdirectories
for csv_file in BASE_DIR.rglob("*.csv"):
    with open(csv_file, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row_num, row in enumerate(reader):
            if len(row) < 6:
                continue

            blob_str = row[5].strip()
            if not blob_str:
                continue

            blob = parse_blob(blob_str)
            if not isinstance(blob, list):
                continue

            for entry in blob:
                if isinstance(entry, dict) and 'hash' in entry and 'value' in entry:
                    parsed.append({
                        "file": str(csv_file.relative_to(BASE_DIR)),
                        "row": row_num,
                        "hash": entry["hash"],
                        "value": entry["value"],
                        "type": classify_value(str(entry["value"])),
                        "markup": entry.get("markup")
                    })

# Save results
with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    json.dump(parsed, out, indent=2)

print(f"✅ Done! Parsed {len(parsed)} items from CSVs in nested folders.")
print(f"📝 Output saved to: {OUTPUT_FILE}")
