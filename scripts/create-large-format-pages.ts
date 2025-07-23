// Scripts/create-large-format-pages.ts

import fs from 'fs'
import path from 'path'

const baseDir = path.join(process.cwd(), 'src/app')

// ---- CATEGORIES ----
const categories = [
  'large-format/coroplast-signs',
  'large-format/floor-graphics',
  'large-format/foam-board',
  'large-format/aluminum-signs',
  'large-format/banners',
  'large-format/pull-up-banners',
  'large-format/car-magnets',
  'large-format/table-covers',
  'large-format/adhesive-vinyl',
  'large-format/window-graphics',
  'large-format/large-format-posters',
  'large-format/styrene-signs',
  'large-format/display-board',
  'large-format/canvas',
  'large-format/sintra-pvc',
  'large-format/x-frame-banners',
  'large-format/a-frame-signs',
  'large-format/wall-decals',
  'large-format/a-frame-stands',
  'large-format/h-stands',
]

// ---- PRODUCTS ----
const products = [
  '4mm-coroplast-yard-signs',
  '6mm-coroplast',
  '8mm-coroplast',
  '10mm-coroplast',
  '4mm-foam-board',
  'floor-graphics',
  'social-distancing-floor-graphics',
  '3mm-aluminum-signs',
  '13oz-glossy-vinyl',
  '13oz-matte-vinyl',
  '8oz-polyester-mesh',
  'pull-up-silver-base',
  'pull-up-black-base',
  'premium-stand-vinyl',
  'table-top-banner',
  'premium-wide-banner',
  'double-sided-banner',
  'car-magnets-30mil',
  'table-cover-6ft',
  'table-cover-8ft',
  'glossy-adhesive-vinyl',
  'perforated-window-vinyl',
  '8pt-c2s-poster',
  '20pt-styrene',
  '24pt-display-board',
  '40pt-display-board',
  'canvas-roll',
  'stretched-canvas',
  '3mm-pvc',
  'x-frame-banner',
  'a-frame-signs',
  'removable-wall-decal',
  'a-frame-stands',
  'h-stands',
]

// ---- UTIL ----
function makePage(filePath: string, title: string) {
  const content = `export default function Page() {
  return <h1>${title}</h1>
}`
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  console.log(`✅ Created: ${filePath}`)
}

// ---- GENERATE CATEGORY ROUTES ----
for (const category of categories) {
  const categoryPath = path.join(baseDir, 'category', category, 'page.tsx')
  makePage(categoryPath, `Category: ${category}`)
}

// ---- GENERATE PRODUCT ROUTES ----
for (const product of products) {
  const productPath = path.join(baseDir, 'product', product, 'page.tsx')
  makePage(productPath, `Product: ${product}`)
}
