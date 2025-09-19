import csv
import sys

# Increase max CSV field size to avoid errors on large fields
csv.field_size_limit(sys.maxsize)

CSV_PATH = "/home/twoldridge/adap-site/table_data/sinalite_categorized_export/Large_Format/Aluminum Signs.csv"

def main():
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        first_row = next(reader)

    keys = list(first_row.keys())
    print("Column names:")
    print(keys)
    
    # Save keys to a file for easier browsing
    with open("first_row_keys.txt", "w", encoding="utf-8") as out_file:
        out_file.write(str(keys))
    print("\n➡️ Column names saved to 'first_row_keys.txt'")

    print("\nColumns with large data (over 100 chars), truncated to 200 chars:\n")
    for key, value in first_row.items():
        if value and len(value) > 100:
            print(f"{key}: {value[:200]}... [truncated]\n")

if __name__ == "__main__":
    main()
