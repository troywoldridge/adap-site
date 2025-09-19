// scripts/sync-batch.ts
/**
 * Usage:
 *   pnpm -s sync:batch 9
 * Reads numeric IDs from src/product_ids.txt (one per line).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const store = Number(process.argv[2] || 9);
if (!Number.isFinite(store)) {
  console.error("Usage: pnpm -s sync:batch <storeCode(6|9)>");
  process.exit(1);
}

const idsPath = path.resolve("src/product_ids.txt");
if (!fs.existsSync(idsPath)) {
  console.error(`Missing file: ${idsPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(idsPath, "utf8");
const ids = raw.split(/\r?\n/).map(l => l.trim()).filter(l => /^\d+$/.test(l));

(async () => {
  for (const id of ids) {
    console.log(`➡️  Syncing product ${id} (store ${store})…`);
    const p = spawn("pnpm", ["-s", "sync:product", id, String(store)], { stdio: "inherit" });
    await new Promise((res, rej) => {
      p.on("close", (code) => code === 0 ? res(null) : rej(new Error(`sync:product failed for ${id}`)));
    });
    console.log(`✅ Done: ${id}`);
  }
})();
