import pandas as pd
import re

# 8 main categories
CATEGORY_MAP = {
    'business cards': 'Business Cards',
    'flyer': 'print-products',
    'brochure': 'print-products',
    'sheet': 'print-products',
    'poster': 'large-format',
    'banner': 'large-format',
    'label': 'labels and packaging',
    'sticker': 'labels and packaging',
    'letterhead': 'stationary',
    'envelope': 'stationary',
    'sample': 'sample kits',
    'shirt': 'apparel',
    'hoodie': 'apparel',
    'pen': 'promotional',
    'mug': 'promotional',
    'tote': 'promotional',
}

def clean_filename(filename):
    name = re.sub(r'\.[^.]+$', '', filename)  # remove file extension
    name = re.sub(r'[_\-]\d+$', '', name)     # remove trailing -1, _2, etc
    name = name.replace('-', ' ').replace('_', ' ')
    return name.lower()

def guess_category(text):
    for keyword, category in CATEGORY_MAP.items():
        if keyword in text:
            return category
    return 'uncategorized'

def guess_subcategory(text):
    # crude heuristic: take first few words before number or descriptor
    parts = re.split(r'\d|pt|lb|inch|oz', text)
    return parts[0].strip().title()

# Load
df = pd.read_csv("images_with_products_clean.csv")
df["name_clean"] = df["filename"].apply(clean_filename)
df["guessed_subcategory"] = df["name_clean"].apply(guess_subcategory)
df["guessed_category"] = df["name_clean"].apply(guess_category)

# Output for manual review
df[["cloudflare_id", "filename", "guessed_subcategory", "guessed_category"]].to_csv("guessed_categories.csv", index=False)
print("✅ Saved to guessed_categories.csv")
