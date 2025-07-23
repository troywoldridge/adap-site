#!/usr/bin/env python3

import csv
import os
import re
from pathlib import Path
from collections import defaultdict
import csv
import sys

# Increase CSV field size limit to max possible
csv.field_size_limit(sys.maxsize)

# === Paths ===
INPUT_DIR = Path("table_data/sinalite_api_export")
OUTPUT_DIR = Path("table_data/sinalite_categorized_export")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# === Your finalized category mapping ===
CATEGORY_STRUCTURE = {
    "Business Cards": [
        "Business Cards", "Folded Business Cards", "Specialty Business Cards"
    ],
    "Print Products": [
        "Postcards", "Flyers", "Brochures", "Booklets", "Magnets", "Greeting Cards",
        "Invitations", "Numbered Tickets", "Wall Calendars", "Variable Printing",
        "Posters", "Door Hangers", "Digital Sheets", "Tent Cards", "Plastics",
        "Tear Cards"
    ],
    "Large Format": [
        "Vinyl Banners", "Window Graphics", "Floor Graphics", "Wall Decals",
        "Clings", "X-Frame Banners", "A-Frame Signs", "Pull Up Banners",
        "Foam Board", "Styrene Signs", "Sintra Rigid Board", "Coroplast Signs / Yard Signs",
        "Aluminum Signs", "Canvas", "Display Board POP", "H-Stands for Signs"
    ],
    "Stationery": [
        "Letterhead", "Envelopes", "Notepads", "NCR Forms"
    ],
    "Labels and Packaging": [
        "Roll Labels / Stickers", "Square Cut Labels / Stickers", "Supply Boxes"
    ],
    "Promotional": [
        "Bookmarks", "Presentation Folders", "Table Covers"
    ],
    "Apparel": [],
    "Sample Kits": ["Sample Kits"]
}

def sanitize_filename(name):
    """Make filenames safe by replacing unwanted chars with underscore."""
    return re.sub(r"[^\w\-_. ]", "_", name)

def match_category(raw_cat):
    """Match a product category string to a top-level category and subcategory."""
    raw = raw_cat.strip().lower()
    for top_cat, subcats in CATEGORY_STRUCTURE.items():
        for subcat in subcats:
            # normalize for matching
            sub_clean = subcat.lower().replace("/", "").replace("-", " ").replace(" ", "")
            raw_clean = raw.replace("/", "").replace("-", " ").replace(" ", "")
            if sub_clean in raw_clean or raw_clean in sub_clean:
                return top_cat, subcat
    # fallback if no match
    return "Uncategorized", raw_cat

def organize_products():
    product_files = list(INPUT_DIR.glob("products_*.csv"))
    print(f"📁 Found {len(product_files)} product files in {INPUT_DIR}")

    for file in product_files:
        with file.open(newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                raw_cat = row.get("category", "").strip()
                if not raw_cat:
                    continue
                top_cat, sub_cat = match_category(raw_cat)

                # Prepare output path
                top_dir = OUTPUT_DIR / sanitize_filename(top_cat)
                top_dir.mkdir(parents=True, exist_ok=True)
                output_file = top_dir / f"{sanitize_filename(sub_cat)}.csv"

                # Check if file exists to write header or append
                write_header = not output_file.exists()
                with output_file.open("a", newline='', encoding='utf-8') as out_f:
                    writer = csv.DictWriter(out_f, fieldnames=reader.fieldnames)
                    if write_header:
                        writer.writeheader()
                    writer.writerow(row)

    print(f"✅ All products categorized and saved under {OUTPUT_DIR.resolve()}")

if __name__ == "__main__":
    organize_products()
