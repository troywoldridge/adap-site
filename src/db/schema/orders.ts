// src/db/schema/orders.ts
import {
  pgTable, uuid, text, char, integer, timestamp, numeric, index,
} from "drizzle-orm/pg-core";

export const orders = pgTable(
  "orders",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    status: text().default("draft").notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
    orderNumber: text("order_number"),
    currency: char({ length: 3 }),
    subtotalCents: integer("subtotal_cents").default(0).notNull(),
    taxCents: integer("tax_cents").default(0).notNull(),
    shippingCents: integer("shipping_cents").default(0).notNull(),
    discountCents: integer("discount_cents").default(0).notNull(),
    totalCents: integer("total_cents").default(0).notNull(),
    placedAt: timestamp("placed_at", { withTimezone: true, mode: "string" }),
    provider: text(),
    providerId: text("provider_id"),
    customerId: text("customer_id"), // you set TEXT earlier
    billingAddressId: uuid("billing_address_id"),
    shippingAddressId: uuid("shipping_address_id"),
    total: numeric(),                 // keeping your existing column
    cartId: uuid("cart_id"),
    paymentStatus: text("payment_status").default("paid"),
    creditsCents: integer("credits_cents").default(0),
  },
  (t) => [
    // ✅ make these names globally unique
    index("orders_customer_id_idx").on(t.customerId),
    index("orders_provider_provider_id_idx").on(t.provider, t.providerId),
    // If you also want a fast lookup by user:
    // index("orders_user_id_idx").on(t.userId),
  ],
);
