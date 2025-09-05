// src/db/schema/cartLines.ts
import { pgTable, uuid, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { carts } from "./cart";

export const cartLines = pgTable("cart_lines", {
  id: uuid("id").primaryKey().defaultRandom(),

  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),

  productId: integer("product_id").notNull(),

  quantity: integer("quantity").notNull().default(1),

  // Unit price snapshot in cents (required)
  unitPriceCents: integer("unit_price_cents").notNull().default(0),

  // Optional precomputed line total in cents (nullable, NO default(null))
  lineTotalCents: integer("line_total_cents"),

  // Option selections (IDs) as JSON array; give a real SQL default, not null
  optionIds: jsonb("option_ids")
    .$type<number[]>()              // tells TS this is number[]
    .notNull()
    .default(sql`'[]'::jsonb`),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
