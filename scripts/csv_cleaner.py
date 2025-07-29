import csv

input_csv = '/home/twoldridge/adap-site/table_data/image_table_with_ids.csv'
output_csv = '/home/twoldridge/adap-site/table_data/images_cleaned_for_db.csv'

with open(input_csv, newline='') as infile, open(output_csv, 'w', newline='') as outfile:
    reader = csv.DictReader(infile)
    writer = csv.writer(outfile)

    # Write the new header for DB insert
    writer.writerow(['category_id', 'subcategory_id', 'alt', 'filename', 'cloudflare_id'])

    for row in reader:
        writer.writerow([
            row['category_id'],
            row['subcategory_id'],
            row['name'],
            row['image_name'],
            row['cloudflare_image_id']
        ])
