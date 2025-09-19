import os
import csv
import json
import re
import sys

# Increase CSV field size limit to 500MB before reading any CSV files
csv.field_size_limit(524288000)  # 500 * 1024 * 1024

BASE_DIR = 'table_data/sinalite_categorized_export'  # Adjust as needed

def clean_json_str(json_str):
    # Replace Python-style single quotes with double quotes for JSON
    json_str = json_str.replace("'", '"')
    # Replace None with null for JSON
    json_str = re.sub(r'\bNone\b', 'null', json_str)
    return json_str

def parse_options_json(options_str):
    clean_str = clean_json_str(options_str)
    try:
        options = json.loads(clean_str)
        return options
    except json.JSONDecodeError as e:
        print("JSON parse error:", e)
        return None

def process_csv_file(filepath):
    print(f"Processing file: {filepath}")
    with open(filepath, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        parsed_rows = []
        error_rows = []

        for row in reader:
            options_json_str = row.get('options', '')
            if not options_json_str:
                error_rows.append((row, "Missing options JSON"))
                continue

            parsed_options = parse_options_json(options_json_str)
            if parsed_options is None:
                error_rows.append((row, "Failed to parse options JSON"))
                continue

            parsed_rows.append({
                'product_id': row.get('product_id') or row.get('id') or 'unknown',
                'parsed_options': parsed_options
            })

        print(f"Parsed {len(parsed_rows)} rows successfully, {len(error_rows)} errors.")

        # Save parsed options to JSON file
        out_json_path = filepath + '.parsed_options.json'
        with open(out_json_path, 'w', encoding='utf-8') as f_out:
            json.dump(parsed_rows, f_out, indent=2)

        # Save errors to log file if any
        if error_rows:
            error_log_path = filepath + '.options_parse_errors.log'
            with open(error_log_path, 'w', encoding='utf-8') as f_err:
                for err_row, err_msg in error_rows:
                    f_err.write(f"{err_msg} - {json.dumps(err_row)}\n")

def process_all_csv_files(base_dir):
    for root, _, files in os.walk(base_dir):
        for file in files:
            if file.lower().endswith('.csv'):
                full_path = os.path.join(root, file)
                process_csv_file(full_path)

if __name__ == '__main__':
    process_all_csv_files(BASE_DIR)
