import csv
import os
import re
import requests
import json

INPUT_CSV = "/home/twoldridge/adap-site/table_data/image_table_real_fixed.csv"
OUTPUT_CSV = "/home/twoldridge/adap-site/table_data/image_table_with_ids.csv"
MISSING_CSV = "/home/twoldridge/adap-site/table_data/missing_images.csv"

CLOUDFLARE_ACCOUNT_ID = "720ec85be65a483a3e34400d56dba5d8"
CLOUDFLARE_API_TOKEN = "bhkoxk3aAZdfx9wRCNQA4LaonO5UznwWwlZ3zUsF"

headers = {
    "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
}

def fetch_cloudflare_images(cursor=None):
    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/images/v1"
    params = {"per_page": 100}
    if cursor:
        params["cursor"] = cursor
        
    response = requests.get(url, headers=headers, params=params)
    if response.status_code != 200:
        raise Exception(f"❌ Failed to fetch images: {response.status_code} - {response.text}")
    
    print(f"🔴 Cloudflare response body: {response.text}")


    data = response.json()
    if not data.get("success"):
        raise Exception(f"❌ API returned error: {data.get('errors') or data}")

    return data

def normalize_basename(filename):
    """Extract base part of image name (without _1, _2, etc.)"""
    base, _ = os.path.splitext(filename)
    return re.sub(r'_[0-9]+$', '', base)

def build_filename_lookup():
    lookup = {}
    cursor = None
    print("🔍 Building Cloudflare image index...")

    while True:
        print(f"🌐 Requesting page of images... (cursor: {cursor or 'first'})")
        data = fetch_cloudflare_images(cursor)

        images = data.get("result", {}).get("images", [])
        pagination = data.get("result", {}).get("pagination", {})

        for img in images:
            filename = img.get("filename", "")
            if filename:
                base = normalize_basename(filename)
                if base not in lookup:
                    lookup[base] = []
                lookup[base].append({
                    "id": img["id"],
                    "filename": filename
                })

        if not pagination or not pagination.get("has_more"):
            break
        cursor = pagination.get("cursor")

    return lookup


def update_csv_with_image_ids():
    cf_lookup = build_filename_lookup()
    print(f"✅ {sum(len(v) for v in cf_lookup.values())} Cloudflare images loaded (across {len(cf_lookup)} base filenames).")

    missing = []

    with open(INPUT_CSV, newline='') as infile, open(OUTPUT_CSV, 'w', newline='') as outfile:
        reader = csv.DictReader(infile)

        # Dynamically detect where the image filename is
        if 'image_name' in reader.fieldnames:
            image_field = 'image_name'
        elif 'sub_category' in reader.fieldnames:
            image_field = 'sub_category'
        else:
            raise Exception("❌ No 'image_name' or 'sub_category' field found in CSV")

        # Add new columns if they don't already exist
        new_fields = ['cloudflare_image_id', 'image_found', 'cloudflare_image_url', 'matched_filename']
        fieldnames = reader.fieldnames + [f for f in new_fields if f not in reader.fieldnames]

        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            filename = row.get(image_field, "").strip()
            base = normalize_basename(filename)
            matches = cf_lookup.get(base, [])

            if not matches:
                # No image match found
                for f in new_fields:
                    row[f] = ""
                row['image_found'] = "no"
                writer.writerow(row)
                missing.append(row)
                continue

            # One match per row
            for match in matches:
                new_row = row.copy()
                new_row['cloudflare_image_id'] = match['id']
                new_row['image_found'] = "yes"
                new_row['matched_filename'] = match['filename']
                new_row['cloudflare_image_url'] = f"https://imagedelivery.net/pJ0fKvjCAbyoF8aD0BGu8Q/{match['id']}/public"
                writer.writerow(new_row)

    print(f"\n✅ Output written: {OUTPUT_CSV}")
    if missing:
        print(f"⚠️ {len(missing)} products had no image matches. Writing list to: {MISSING_CSV}")
        with open(MISSING_CSV, 'w', newline='') as missfile:
            miss_writer = csv.DictWriter(missfile, fieldnames=fieldnames)
            miss_writer.writeheader()
            miss_writer.writerows(missing)
    else:
        print("🎉 All images matched successfully!")

if __name__ == "__main__":
    update_csv_with_image_ids()
