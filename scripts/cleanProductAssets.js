// scripts/cleanProductAssets.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Shim __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanFile(relPath) {
  const filePath = path.resolve(__dirname, relPath);
  const raw = await fs.readFile(filePath, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${relPath}: ${e.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error(
      `${relPath} does not contain an array at the root (found ${typeof data})`
    );
  }

  const cleaned = data.map(item => {
    if (typeof item.product_id === 'string' && item.product_id.endsWith('.0')) {
      const num = Number(item.product_id.slice(0, -2));
      if (!Number.isNaN(num)) {
        item.product_id = num;
      }
    }
    return item;
  });

  await fs.writeFile(filePath, JSON.stringify(cleaned, null, 2));
  console.log(`✅ Cleaned: ${relPath}`);
}

(async () => {
  try {
    await cleanFile('../src/data/productAssets.json');
    await cleanFile('../src/data/categoryAssets.json');
    console.log('🎉 All files cleaned successfully!');
  } catch (err) {
    console.error('❌ Cleaning failed:', err.message);
    process.exit(1);
  }
})();
