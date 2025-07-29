import pandas as pd
import re

# Load your cleaned image file
df = pd.read_csv('images_with_products_clean.csv')  # Must include: cloudflare_id, filename, matched_sku, product_id, alt

# Load subcategories (export from DB: id, name, category_id)
subcat_df = pd.read_csv('subcategories.csv')  # Must include: id, name, category_id

# Clean alt to generate subcategory name (e.g., remove trailing "_1" or "-2")
def clean_alt(alt):
    if pd.isna(alt):
        return ''
    return re.sub(r'[_\-]\d+$', '', alt.strip().lower())

df['guessed_subcategory'] = df['alt'].apply(clean_alt)

# Make subcategory names lowercase for easier comparison
subcat_df['name_clean'] = subcat_df['name'].str.strip().str.lower()

# Merge guessed subcategories with real subcategories to get ID
merged = df.merge(subcat_df, left_on='guessed_subcategory', right_on='name_clean', how='left')

# Rename for clarity
merged = merged.rename(columns={
    'id': 'subcategory_id',
    'category_id': 'category_id'
})

# Final result
result = merged[['cloudflare_id', 'filename', 'product_id', 'subcategory_id', 'category_id']]
result.to_csv('images_with_categories.csv', index=False)

print("✅ File created: images_with_categories.csv")
