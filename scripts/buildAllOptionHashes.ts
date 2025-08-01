// scripts/buildAllOptionHashes.ts

import crypto from "crypto";
import { db } from "@/lib/db"; // adjust as needed
import {
  products,
  product_option_hashes,
  options,
} from "@/drizzle/migrations/schema";
import { eq } from "drizzle-orm";

// --- Helpers ---
const pad = (n: number): string => n.toString().padStart(2, "0");

function cartesian<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>(
    (acc, group) =>
      acc.flatMap((accRow) => group.map((item) => [...accRow, item])),
    [[]]
  );
}

function groupOptionsByGroup(options: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const opt of options) {
    const {group} = opt;
    if (!map.has(group)) {
      map.set(group, []);
    }
    map.get(group)!.push(opt);
  }
  return map;
}

// --- Main Logic ---
async function generateHashesForProduct(productId: number) {
  const allOptions = await db
    .select()
    .from(options)
    .where(eq(options.productId, productId));

  const grouped = groupOptionsByGroup(allOptions);

  if (grouped.size !== 6) {
    console.warn(
      `⚠️ Skipping product ${productId} — expected 6 option groups, got ${grouped.size}`
    );
    return;
  }

  const groupArrays = [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0])) // keep order deterministic
    .map(([, opts]) => opts);

  const combos = cartesian(groupArrays);
  const now = new Date();

  const inserts = combos.map((combo) => {
    const optionIds = combo.map((opt) => opt.optionId);
    const optionChain = optionIds.map(pad).join(""); // 12-digit string
    const hash = crypto.createHash("md5").update(optionChain).digest("hex");

    return {
      productId,
      optionIds: optionIds.join(","), // store as comma-separated string
      optionChain,
      hash,
      createdAt: now,
      updatedAt: now,
    };
  });

  if (inserts.length > 0) {
    await db
      .insert(product_option_hashes)
      .values(inserts)
      .onConflictDoUpdate({
        target: [
          product_option_hashes.productId,
          product_option_hashes.optionChain,
        ],
        set: {
          updatedAt: now,
        },
      });
    console.log(`✅ Product ${productId}: ${inserts.length} hashes upserted`);
  }
}

async function main() {
  console.time("🔧 Total hash generation time");

  const allProducts = await db.select().from(products);

  for (const product of allProducts) {
    await generateHashesForProduct(product.id);
  }

  console.timeEnd("🔧 Total hash generation time");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
