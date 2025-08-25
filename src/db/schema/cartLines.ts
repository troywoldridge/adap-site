// src/db/schema/cartLines.ts
import {
  pgTable, uuid, integer, jsonb, timestamp,
} from "drizzle-orm/pg-core";

export const cartLines = pgTable("cart_lines", {
  id: uuid("id").defaultRandom().primaryKey(),

  cartId: uuid("cart_id").notNull(),            // (FK optional; relation can live in relations.ts)
  productId: integer("product_id").notNull(),

  quantity: integer("quantity").notNull().default(1),

  // Store option value IDs as a JSON array (jsonb) – ex: [273,78,91,102,93]
  optionIds: jsonb("option_ids").$type<number[]>().notNull().default([]),

  // Optional artwork blob (you use R2 keys later)
  artwork: jsonb("artwork").$type<Record<string, string> | null>().default(null),

  // 💸 Money in cents
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  lineTotalCents: integer("line_total_cents").notNull().default(0),

  // Keep the priced option ids we actually used for pricing (json array)
  pricedOptionIds: jsonb("priced_option_ids").$type<number[] | null>().default(null),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
