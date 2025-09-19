import pandas as pd

# Load original CSV
df = pd.read_csv('images_with_products.csv')

# Convert product_id to numeric, coercing errors to NaN (null)
df['product_id'] = pd.to_numeric(df['product_id'], errors='coerce')

# Drop .0 by converting floats to integers where possible (skip NaNs)
df['product_id'] = df['product_id'].apply(lambda x: int(x) if pd.notna(x) else pd.NA)

# Save clean CSV, empty for missing product_id (NULL in DB)
df.to_csv('images_with_products_clean.csv', index=False)
