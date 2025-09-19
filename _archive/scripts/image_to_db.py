COPY images (
  category_id,
  subcategory_id,
  alt,
  filename,
  cloudflare_id
)
FROM '/home/twoldridge/adap-site/table_data/images_cleaned_for_db.csv'
WITH (
  FORMAT csv,
  HEADER true,
  DELIMITER ',',
  NULL '',
  QUOTE '"'
);
