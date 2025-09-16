// src/db/schema/cartLines.ts
import { pgTable, uuid, integer, jsonb, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { carts } from "./cart";

export const cartLines = pgTable("cart_lines", {
  id: uuid("id").primaryKey().defaultRandom(),

  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),

  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),

  // SELL (cents)
  unitPriceCents: integer("unit_price_cents").notNull().default(0),

  // Optional precomputed line total (cents)
  lineTotalCents: integer("line_total_cents"),

  // Option selections
  optionIds: jsonb("option_ids")
    .$type<number[]>() // TS hint only
    .notNull()
    .default(sql`'[]'::jsonb`),

  artwork: jsonb("artwork"),

  // NEW: currency
  currency: text("currency").$type<"USD" | "CAD">().notNull().default("USD"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
