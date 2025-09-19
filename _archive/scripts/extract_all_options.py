import os
import csv
import glob
import ast

SOURCE_DIR = '/home/twoldridge/adap-site/table_data/sinalite_categorized_export'
OUTPUT_FILE = 'all_extracted_options.csv'
LOG_FILE = 'option_extraction_errors.log'

csv.field_size_limit(524288000)  # 500 MB field limit

def extract_options_from_file(file_path):
    options_data = []
    errors = []

    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        lines = list(reader)

        # Skip first line (row number + header)
        if len(lines) < 2:
            return options_data, errors

        header = lines[1]  # actual header row
        for i, row in enumerate(lines[2:], start=3):  # data rows, starting from line 3
            try:
                if len(row) < 6:
                    continue

                product_id = row[0].strip()
                sku = row[1].strip()
                options_raw = row[4].strip()

                if not options_raw or not options_raw.startswith('['):
                    continue

                options = ast.literal_eval(options_raw)

                for opt in options:
                    options_data.append({
                        'file': os.path.basename(file_path),
                        'product_id': product_id,
                        'sku': sku,
                        'option_id': opt.get('id', ''),
                        'group': opt.get('group', ''),
                        'name': opt.get('name', ''),
                        'hidden': opt.get('hidden', ''),
                    })
            except Exception as e:
                errors.append(f"{file_path} Line {i}: {e}")

    return options_data, errors

def process_all_csvs():
    all_data = []
    all_errors = []

    files = glob.glob(os.path.join(SOURCE_DIR, '**/*.csv'), recursive=True)
    print(f"🔍 Found {len(files)} CSV files...")

    for file_path in files:
        print(f"📄 Processing: {file_path}")
        options, errors = extract_options_from_file(file_path)
        all_data.extend(options)
        all_errors.extend(errors)

    # Write to CSV
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['file', 'product_id', 'sku', 'option_id', 'group', 'name', 'hidden'])
        writer.writeheader()
        writer.writerows(all_data)

    # Write error log
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        for err in all_errors:
            f.write(err + '\n')

    print(f"\n✅ Extracted {len(all_data)} total options from {len(files)} files.")
    print(f"⚠️ Logged {len(all_errors)} errors to {LOG_FILE}")
    print(f"📁 Final output: {OUTPUT_FILE}")

if __name__ == '__main__':
    process_all_csvs()
