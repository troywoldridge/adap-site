// src/db/schema/orderItems.ts
import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// NOTE: Today your Orders table is defined in customer.ts.
// If/when you split it to ./orders, update this import.
import { orders } from "./customer";

/**
 * Matches current DB types:
 *   - order_items.id  => int4 (serial)
 *   - orders.id       => int4
 *
 * If you later migrate orders/order_items to UUID, change:
 *   - id: uuid("id").defaultRandom().primaryKey()
 *   - orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" })
 * and run a proper migration to alter the DB types.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),

    // FK → orders.id (int4)
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Adjust/extend these to your real columns
    productId: integer("product_id").notNull(),
    name: text("name"),

    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    lineTotalCents: integer("line_total_cents").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  // Table extras (indexes)
  (t) => ({
    byOrder: index("idx_order_items_order").on(t.orderId),
  })
);
