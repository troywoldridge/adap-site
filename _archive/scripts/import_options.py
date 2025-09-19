import os
import csv
import json
import re
import sys

csv.field_size_limit(524288000)  # 500 MB field limit

BASE_DIR = 'table_data/sinalite_categorized_export'

def clean_json_str(json_str):
    if not json_str or not json_str.strip():
        return None
    # Replace single quotes with double quotes
    json_str = json_str.replace("'", '"')
    # Replace Python-style None with JSON null
    json_str = re.sub(r'\bNone\b', 'null', json_str)
    return json_str

def parse_options_json(options_str):
    clean_str = clean_json_str(options_str)
    if not clean_str:
        return None
    try:
        options = json.loads(clean_str)
        return options
    except json.JSONDecodeError as e:
        return None

def process_all_csv_files(base_dir):
    all_parsed = []
    all_errors = []

    for root, _, files in os.walk(base_dir):
        for file in files:
            if file.lower().endswith('.csv'):
                full_path = os.path.join(root, file)
                print(f"🔍 Processing: {full_path}")
                with open(full_path, newline='', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)
                    for row in reader:
                        options_str = row.get('options', '')
                        product_id = row.get('product_id') or row.get('id') or 'unknown'

                        parsed_options = parse_options_json(options_str)
                        if parsed_options is None:
                            all_errors.append({
                                "product_id": product_id,
                                "file": full_path,
                                "reason": "Bad or empty options JSON"
                            })
                            continue

                        all_parsed.append({
                            "product_id": product_id,
                            "parsed_options": parsed_options
                        })

    return all_parsed, all_errors

if __name__ == '__main__':
    parsed, errors = process_all_csv_files(BASE_DIR)

    print(f"\n✅ Extracted options from {len(parsed)} rows")
    print(f"❌ Skipped {len(errors)} rows due to errors")

    with open('all_parsed_options.json', 'w', encoding='utf-8') as f_out:
        json.dump(parsed, f_out, indent=2)

    if errors:
        with open('all_options_parse_errors.log', 'w', encoding='utf-8') as f_err:
            for err in errors:
                f_err.write(json.dumps(err) + '\n')

    print("\n🎉 Done! Output saved to:")
    print(" → all_parsed_options.json")
    print(" → all_options_parse_errors.log (if any)")
