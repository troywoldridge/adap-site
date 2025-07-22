import fs from 'fs'
import path from 'path'

const baseDir = path.join(process.cwd(), 'pages')

// List of categories
const categories = [
  'print-products/booklets',
  'print-products/magnets',
  'print-products/greeting-cards',
  'print-products/invitations',
  'print-products/numbered-tickets',
  'print-products/wall-calendars',
  'print-products/variable-printing',
  'print-products/posters',
  'print-products/door-hangers',
  'print-products/digital-sheets',
  'print-products/folded-business-cards',
  'print-products/tent-cards',
  'print-products/plastics',
  'print-products/tear-cards',
  'print-products/clings',
]

// List of products (all product slugs from your Print Products list)
const products = [
  // Booklets
  '80lb-gloss-text-8.5x5.5',
  '80lb-gloss-text-8.5x11',
  '100lb-gloss-text-8.5x5.5',
  '100lb-gloss-text-8.5x11',
  '60lb-offset-text-8.5x5.5',
  '60lb-offset-text-8.5x11',
  '80lb-silk-text-8.5x5.5',
  '80lb-silk-text-8.5x11',
  '100lb-silk-text-8.5x5.5',
  '100lb-silk-text-8.5x11',

  // Magnets
  'magnets-14pt',
  'car-magnets-30mil',
  'cut-shape-magnets-30mil',
  'cut-shape-magnets-20mil',

  // Greeting Cards
  '14pt-matte-greeting-cards',
  '14pt-uv-greeting-cards',
  '14pt-writable-uv-greeting-cards',
  '13pt-enviro-greeting-cards',
  '14pt-aq-greeting-cards',
  '14pt-writable-aq-greeting-cards',
  'metallic-foil-greeting-cards',
  'kraft-paper-greeting-cards',
  'spot-uv-greeting-cards',
  'pearl-paper-greeting-cards',

  // Invitations / Announcements
  '14pt-matte-invitations',
  '14pt-writable-aq-invitations',
  '14pt-aq-invitations',
  '14pt-uv-invitations',
  'kraft-paper-invitations',
  'pearl-paper-invitations',
  'metallic-foil-invitations',

  // Numbered Tickets
  '14pt-numbered-tickets',

  // Wall Calendars
  '80lb-gloss-wall-calendars',
  '100lb-gloss-wall-calendars',

  // Variable Printing
  '14pt-variable-printing',

  // Posters
  '100lb-gloss-posters',
  '100lb-matte-posters',
  '100lb-uv-posters',
  '80lb-enviro-posters',
  '8pt-c2s-posters',

  // Door Hangers
  '14pt-matte-door-hangers',
  '14pt-uv-door-hangers',
  '13pt-enviro-door-hangers',
  '14pt-aq-door-hangers',

  // Digital Sheets
  '14pt-matte-digital',
  '13pt-enviro-digital',
  '100lb-gloss-digital',
  '100lb-matte-digital',
  '80lb-enviro-digital',

  // Folded Business Cards
  '14pt-matte-folded',
  '14pt-uv-folded',
  '13pt-enviro-folded',

  // Tent Cards
  '14pt-matte-tent-cards',

  // Plastics
  '14pt-plastic',

  // Tear Cards
  '14pt-matte-tear-cards',
  '14pt-uv-tear-cards',
  '13pt-enviro-tear-cards',

  // Clings
  'transparent-clings',
  'white-opaque-clings',
]

function makePage(filePath, title) {
  const content = `export default function Page() {
  return <h1>${title}</h1>
}
`
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  console.log(`Created ${filePath}`)
}

for (const category of categories) {
  const filePath = path.join(baseDir, 'category', category, 'index.js')
  makePage(filePath, `Category: ${category}`)
}

for (const product of products) {
  const filePath = path.join(baseDir, 'product', `${product}.js`)
  makePage(filePath, `Product: ${product}`)
}
