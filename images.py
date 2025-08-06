import csv

CSV1 = "/home/twoldridge/adap-site/csv/image_table_real_fixed.csv"
CSV2 = "/home/twoldridge/adap-site/csv/images_with_products.csv"
OUTPUT = "/home/twoldridge/adap-site/csv/image_table_matched_output.csv"

lookup = {}
with open(CSV2, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        filename = row["filename"].strip()
        lookup[filename] = row

with open(CSV1, newline="", encoding="utf-8") as fin, \
     open(OUTPUT, "w", newline="", encoding="utf-8") as fout:
    reader = csv.DictReader(fin)
    fieldnames = [
        "category_id",
        "subcategory_id",
        "name",
        "image_name",
        "cloudflare_id",
        "product_id",
        "matched_sku"
    ]
    writer = csv.DictWriter(fout, fieldnames=fieldnames)
    writer.writeheader()
    for row in reader:
        image_name = row["image_name"].strip()
        match = lookup.get(image_name)
        out = {
            "category_id": row.get("category_id", ""),
            "subcategory_id": row.get("subcategory_id", ""),
            "name": row.get("name", ""),
            "image_name": image_name,
            "cloudflare_id": match["cloudflare_id"] if match else "",
            "product_id": match["product_id"] if match else "",
            "matched_sku": match["matched_sku"] if match else ""
        }
        writer.writerow(out)

print(f"Done! Output: {OUTPUT}")
