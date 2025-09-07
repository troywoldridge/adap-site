// src/lib/loaders/categoryAssets.ts
import "server-only";
import { promises as fs } from "fs";
import path from "path";

export async function readCategoryAssets() {
  const file = path.join(process.cwd(), "src/data/categoryAssets.json");
  const buf = await fs.readFile(file);   // <- Buffer (fast for cache)
  return JSON.parse(buf.toString("utf8"));
}
