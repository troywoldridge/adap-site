import fs from 'fs';
import path from 'path';

const baseDir = path.join(process.cwd(), 'src/app');

// Category > Subcategory > Product
const data: Record<string, Record<string, string[]>> = {
  'stationary': {
    'letterhead': ['Letterhead'],
    'envelopes': [
      '60lb Uncoated',
      'Self-Adhesive 60lb Uncoated',
      'Security 60lb Uncoated'
    ],
    'notepads': [
      '60lb Uncoated 25pgs',
      '60lb Uncoated 50pgs'
    ],
    'ncr-forms': ['3 Part NCR Forms'],
    'supply-boxes': ['Brown Corrugated']
  },
  'promotional': {
    'mugs': [
      '11oz Ceramic Mug',
      '15oz Ceramic Mug',
      '12oz Stainless Steel Mug',
      '16oz Frosted Beer Mug',
      '18 oz Clear Beer Mug'
    ],
    'bottles': ['17oz Stainless Steel Bottle'],
    'puzzles': ['Puzzles'],
    'canvas': ['Stretched Canvas Prints'],
    'tumblers': ['20oz Tumbler'],
    'mason-jars': [
      '12oz Clear Mason Jars',
      '12oz Frosted Mason Jars'
    ],
    'keychains': ['Keychains (Pack of 10)'],
    'coasters': ['Coasters (Pack of 10)'],
    'mouse-pads': ['Mouse Pad'],
    'photo-panels': ['HD Photo Panel']
  },
  'labels-and-packaging': {
    'labels': [
      'BOPP Labels (Premium)',
      'Poly Labels (Durable)',
      'Paper Labels (Most Cost Effective)',
      'Square Cut Labels'
    ],
    'product-boxes': [
      'Straight tuck end product box (STE)',
      'Reverse tuck end product box (RTE)',
      'Auto-lock bottom product box',
      'Product box Sleeves'
    ],
    'corrugated-boxes': ['Mailer Boxes'],
    'flexible-packaging': [
      'Stand Up Pouches',
      'Lay Flat Pouches',
      'Roll Stock'
    ],
    'cut-to-shape-decal': [
      'White Vinyl (Permanent)',
      'White Vinyl (Removable)'
    ]
  },
  'apparel': {
    'mens-clothing': [
      'T-Shirts', 'Long Sleeve Shirts', 'Sweatshirts', 'Hoodies',
      'Tank Tops', 'Embroidered Polos'
    ],
    'womens-clothing': [
      'T-Shirts', 'Long Sleeve Shirts', 'Tank Tops', 'Embroidered Polos'
    ],
    'kids-youth-clothing': [
      'T-Shirts', 'Long Sleeve Shirts', 'Sweatshirts', 'Hoodies'
    ],
    'headwear': ['Embroidered Hats', 'Embroidered Beanies'],
    'accessories': ['Tote Bags']
  },
  'business-cards': {
    'standard': [
      'Quick Ship Business Cards',
      '14pt (Profit Maximizer)',
      '14pt + Matte Finish',
      '16pt + Matte Finish',
      '14pt + UV (High Gloss)',
      '16pt + UV (High Gloss)',
      '18pt Gloss Lamination',
      '18pt Matte / Silk Lamination',
      '14pt + AQ',
      '16pt + AQ',
      '18PT Writable (C1S)',
      '13pt Enviro Uncoated',
      '13pt Linen Uncoated',
      '14pt Writable + AQ (C1S)',
      '14pt Writable + UV (C1S)'
    ],
    'specialty': [
      'Metallic Foil (Raised)',
      'Kraft Paper',
      'Durable',
      'Spot UV (Raised)',
      'Pearl Paper',
      'Die Cut',
      'Soft Touch (Suede)',
      '32pt Painted Edge',
      'Ultra Smooth'
    ]
  },
  'sample-kits': {
    '': [
      'Stocks and Finishes',
      'Standard Sample Kit',
      'Large Format Sample Kit',
      'Roll Label Sample Kit',
      'Specialty Sample Kit'
    ]
  }
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')      // Replace spaces with -
    .replace(/[^\w\-]+/g, '')  // Remove non-word chars
    .replace(/\-\-+/g, '-')    // Replace multiple - with single -
    .replace(/^-+/, '')        // Trim - from start
    .replace(/-+$/, '');       // Trim - from end
}

function makePage(filePath: string, title: string) {
  const content = `export default function Page() {
  return <h1>${title}</h1>;
}
`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log(`✅ Created: ${filePath}`);
}

// Create category and product pages
for (const category in data) {
  for (const subcategory in data[category]) {
    const catPath = path.join(baseDir, 'category', category, subcategory || 'index', 'page.tsx');
    makePage(catPath, `Category: ${subcategory || category}`);

    for (const product of data[category][subcategory]) {
      const slug = slugify(product);
      const prodPath = path.join(baseDir, 'product', `${slug}`, 'page.tsx');
      makePage(prodPath, `Product: ${product}`);
    }
  }
}
