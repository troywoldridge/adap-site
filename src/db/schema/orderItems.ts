// src/db/schema/orderItems.ts
import {
  pgTable, uuid, integer, text, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    orderId: uuid("order_id").notNull(),
    productId: integer("product_id").notNull(),
    name: text("name"),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    lineTotalCents: integer("line_total_cents").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (t) => [
    // ✅ table-scoped, globally unique names
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_product_id_idx").on(t.productId),

    // optional but useful if you commonly look up a product within an order
    // (drop if you don't want this uniqueness)
    uniqueIndex("order_items_order_id_product_id_uq").on(t.orderId, t.productId),
  ],
);