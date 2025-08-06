// scripts/compareAssets.js

// Absolute path (will always work, but less portable)
import { db } from "../lib/db";
import { CATEGORY_ASSETS, SUBCATEGORY_ASSETS } from "../lib/categoryAssets";

const color = {
  yellow: (str) => `\x1b[33m${str}\x1b[0m`,
  green: (str) => `\x1b[32m${str}\x1b[0m`,
  red: (str) => `\x1b[31m${str}\x1b[0m`,
  blue: (str) => `\x1b[36m${str}\x1b[0m`,
  bold: (str) => `\x1b[1m${str}\x1b[0m`,
};

/** Utility: Print a pretty header */
function printHeader(str) {
  console.log("\n" + color.blue("=== " + color.bold(str) + " ==="));
}

async function run() {
  try {
    printHeader("Loading slugs from DB");
    const categories = await db.query.categories.findMany({ columns: { slug: true } });
    const subcategories = await db.query.subcategories.findMany({ columns: { slug: true } });
    console.log(
      `Found ${color.green(categories.length)} categories, ${color.green(subcategories.length)} subcategories in the DB.`
    );

    if (categories.length === 0 || subcategories.length === 0) {
      console.warn(
        color.yellow("⚠️ WARNING: No slugs returned from DB. Is your database connected or seeded?")
      );
    }

    // Sets for fast comparison
    const dbCatSlugs = new Set(categories.map((c) => c.slug));
    const dbSubcatSlugs = new Set(subcategories.map((s) => s.slug));
    const assetCatSlugs = new Set(Object.keys(CATEGORY_ASSETS));
    const assetSubcatSlugs = new Set(Object.keys(SUBCATEGORY_ASSETS));

    // --- CATEGORY COMPARISON ---
    printHeader("Categories");
    let missingCats = 0, extraCats = 0;
    for (const slug of dbCatSlugs) {
      if (!assetCatSlugs.has(slug)) {
        console.log(color.yellow(`⚠️  Missing CATEGORY_ASSETS entry for: "${slug}"`));
        missingCats++;
      }
    }
    for (const slug of assetCatSlugs) {
      if (!dbCatSlugs.has(slug)) {
        console.log(color.red(`❌  Extra/unmatched asset key (not in DB): "${slug}"`));
        extraCats++;
      }
    }

    // --- SUBCATEGORY COMPARISON ---
    printHeader("Subcategories");
    let missingSubcats = 0, extraSubcats = 0;
    for (const slug of dbSubcatSlugs) {
      if (!assetSubcatSlugs.has(slug)) {
        console.log(color.yellow(`⚠️  Missing SUBCATEGORY_ASSETS entry for: "${slug}"`));
        missingSubcats++;
      }
    }
    for (const slug of assetSubcatSlugs) {
      if (!dbSubcatSlugs.has(slug)) {
        console.log(color.red(`❌  Extra/unmatched subcategory asset key: "${slug}"`));
        extraSubcats++;
      }
    }

    // --- SUMMARY ---
    printHeader("Summary");
    if (missingCats + extraCats + missingSubcats + extraSubcats === 0) {
      console.log(color.green("✅ All categories and subcategories are matched between DB and config!"));
    } else {
      console.log(
        `${color.yellow("Categories missing assets:")} ${missingCats}\n` +
        `${color.red("Extra asset category keys:")} ${extraCats}\n` +
        `${color.yellow("Subcategories missing assets:")} ${missingSubcats}\n` +
        `${color.red("Extra asset subcategory keys:")} ${extraSubcats}\n`
      );
      console.log(color.blue("👉 To fix: Add or remove slugs in your /lib/categoryAssets.ts file as needed."));
    }

    console.log(color.bold("\nDone.\n"));
    process.exit(0);

  } catch (err) {
    console.error(color.red("❌ Script failed!"));
    console.error(err.stack || err);
    process.exit(1);
  }
}

run();
