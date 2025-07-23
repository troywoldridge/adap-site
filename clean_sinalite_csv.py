import re

RAW_FILE = "products_complete_raw"
CLEANED_FILE = "products_complete_cleaned.csv"

def clean_json_like_field(text):
    text = text.replace("\n", " ").replace("\r", " ")          # Remove newlines
    text = text.replace("'", '"')                              # Replace single quotes with double
    text = text.replace('"{', '{').replace('}"', '}')          # Remove unnecessary outer quotes
    text = text.replace('""', '"')                             # Fix double double quotes
    text = re.sub(r'(?<!\\)"', r'\"', text)                    # Escape quotes
import re

RAW_FILE = "products_complete_raw"
CLEANED_FILE = "products_complete_cleaned.csv"

def clean_json_like_field(text):
    text = text.replace("\n", " ").replace("\r", " ")
    text = text.replace("'", '"')
    text = text.replace('"{', '{').replace('}"', '}')
    text = text.replace('""', '"')
    text = re.sub(r'(?<!\\)"', r'\"', text)
    return '"' + text.strip() + '"'

def fix_csv_line(line):
    parts = line.split(",")
    # Adjust these indices if needed after inspecting your CSV field layout
    if len(parts) > 10:
        parts[7] = clean_json_like_field(parts[7])   # options
        parts[8] = clean_json_like_field(parts[8])   # pricing
        parts[11] = clean_json_like_field(parts[11]) # price2 (if present)
    return ",".join(parts)

with open(RAW_FILE, "r", encoding="utf-8") as infile, open(CLEANED_FILE, "w", encoding="utf-8") as outfile:
    for i, line in enumerate(infile):
        try:
            cleaned = fix_csv_line(line)
            outfile.write(cleaned + "\n")
        except Exception as e:
            print(f"❌ Skipping bad line {i}: {e}")
