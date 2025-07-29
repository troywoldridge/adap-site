import psycopg2
import pandas as pd
from rapidfuzz import fuzz, process
import os

# Connect to your database
conn = psycopg2.connect(
    dbname="adap",
    user="troy",
    password="Elizabeth71676",
    host="localhost"
)
cur = conn.cursor()

# Get all images and products
cur.execute("SELECT id, filename, cloudflare_id FROM images")
images = cur.fetchall()

cur.execute("SELECT id, sku FROM products")
products = cur.fetchall()

# Convert to DataFrame
images_df = pd.DataFrame(images, columns=["image_id", "filename", "cloudflare_id"])
products_df = pd.DataFrame(products, columns=["product_id", "sku"])

# Strip extension from filenames
images_df["basename"] = images_df["filename"].str.replace(r"\.\w+$", "", regex=True)

# Fuzzy match each image basename to product SKU
def match_sku(basename, skus, threshold=50):
    match = process.extractOne(basename, skus, scorer=fuzz.token_sort_ratio)
    return match[0] if match and match[1] >= threshold else None

# Add matched SKU to each image
images_df["matched_sku"] = images_df["basename"].apply(lambda name: match_sku(name, products_df["sku"].tolist()))

# Merge product_id from products
merged_df = pd.merge(images_df, products_df, left_on="matched_sku", right_on="sku", how="left")

# Final output
output_df = merged_df[["cloudflare_id", "filename", "matched_sku", "product_id"]]
output_df.to_csv("images_with_products.csv", index=False)

print(f"✅ Done! Wrote {len(output_df)} records to images_with_products.csv")
