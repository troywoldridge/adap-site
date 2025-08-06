import csv
import json

input_csv = "/home/twoldridge/adap-site/csv/image_table_matched_output.csv"
output_json = "image_table_matched_output.json"

with open(input_csv, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    rows = list(reader)

with open(output_json, "w", encoding='utf-8') as jsonfile:
    json.dump(rows, jsonfile, indent=2)

print("Done! Saved as", output_json)
