#!/bin/bash

# Set base path to app folder
APP_DIR="./src/app"

# Define all category routes you linked to
declare -a category_paths=(
  "category/print-products"
  "category/print-products/business-cards"
  "category/print-products/flyers"
  "category/print-products/postcards"
  "category/print-products/brochures"
  "category/print-products/bookmarks"
  "category/print-products/presentation-folders"
)

# Define all product routes you linked to
declare -a product_paths=(
  "product/standard-business-cards"
  "product/premium-business-cards"
  "product/standard-flyers"
  "product/glossy-flyers"
  "product/matte-finish-flyers"
  "product/uv-flyers"
  "product/enviro-uncoated-flyers"
  "product/linen-uncoated-flyers"
  "product/matte-finish-postcards"
  "product/10pt-matte-postcards"
  "product/14pt-matte-postcards"
  "product/16pt-matte-postcards"
  "product/UV-High-Gloss-postcards"
  "product/14pt-high-gloss"
  "product/16pt-high-gloss"
  "product/laminated-postcards"
  "product/18pt-gloss-lamination"
  "product/18pt-matte-silk"
  "product/aq-postcards"
  "product/10pt-aq-postcards"
  "product/14pt-aq-postcards"
  "product/16pt-aq-postcards"
  "product/writable-postcards"
  "product/13pt-enviro-uncoated-postcards"
  "product/13pt-linen-uncoated-postcards"
  "product/14pt-writable-aq"
  "product/14pt-writable-uv"
  "product/specialty-postcards"
  "product/metallic-foil-postcards"
  "product/spot-uv-postcards"
  "product/kraft-paper-postcards"
  "product/pearl-paper-postcards"
  "product/gloss-text-brochures"
  "product/100lb-gloss-text"
  "product/matte-finish-brochures"
  "product/100lb-matte-finish"
  "product/uv-high-gloss-brochures"
  "product/100lb-uv-high-gloss-finish"
  "product/enviro-uncoated-brochures"
  "product/80lb-enviro-uncoated"
  "product/matte-bookmarks"
  "product/10pt-matte-bookmarks"
  "product/14pt-matte-bookmarks"
  "product/16pt-matte-bookmarks"
  "product/uv-high-gloss-bookmarks"
  "product/14pt-uv-bookmarks"
  "product/16pt-uv-bookmarks"
  "product/laminated-bookmarks"
  "product/18pt-matte-silk-laminated-bookmarks"
  "product/18pt-gloss-laminated-bookmarks"
  "product/specialty-bookmarks"
  "product/13pt-enviro-uncoated-bookmarks"
  "product/13pt-linen-uncoated-bookmarks"
  "product/14pt-writable-uv-bookmarks"
  "product/18pt-matte-lam-spot-uv-bookmarks"
  "product/matte-folders"
  "product/14pt-matte-finish-folder"
  "product/standard-uv-folders"
  "product/14pt-standard-uv-folders"
  "product/matte-laminated-folders"
  "product/14pt-matte-laminated-folders"
  "product/standard-aq-folders"
  "product/14pt-standard-aq-folders"
  "product/specialty-folders"
  "product/metallic-foil-folder"
)

# Function to create placeholder pages
generate_pages() {
  local paths=("$@")
  for route in "${paths[@]}"; do
    full_path="$APP_DIR/$route"
    mkdir -p "$full_path"
    cat <<EOF > "$full_path/page.tsx"
export default function Page() {
  return <h1>Placeholder for: /$route</h1>
}
EOF
    echo "✅ Created /$route/page.tsx"
  done
}

echo "📁 Creating category pages..."
generate_pages "${category_paths[@]}"

echo "📁 Creating product pages..."
generate_pages "${product_paths[@]}"

echo "🎉 Done!"
