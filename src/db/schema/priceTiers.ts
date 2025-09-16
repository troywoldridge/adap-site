// src/db/schema/priceTiers.ts
import { pgTable, serial, text, integer, numeric } from "drizzle-orm/pg-core";

export const priceTiers = pgTable("price_tiers", {
  id: serial("id").primaryKey(),
  scope: text("scope").notNull(), // 'product' | 'subcategory' | 'category' | 'global'
  scopeId: integer("scope_id"),   // nullable for global
  store: text("store").notNull(), // 'US' | 'CA'
  minQty: integer("min_qty").notNull(),
  maxQty: integer("max_qty"),
  mult: numeric("mult", { precision: 6, scale: 3 }).notNull(),
  floorPct: numeric("floor_pct", { precision: 5, scale: 3 }),
});
