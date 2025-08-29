// src/db/schema/commerce.ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { customerAddresses } from "@/db/schema/customerAddresses";

/** enums */
export const orderStatus = pgEnum("order_status", [
  "draft",
  "submitted",
  "paid",
  "fulfilled",
  "cancelled",
  "refunded",
]);

export const loyaltyReason = pgEnum("loyalty_reason", [
  "purchase",
  "refund",
  "adjustment",
  "signup",
  "promotion",
]);

export const currencyEnum = pgEnum("currency_code", ["USD", "CAD"]);

/** optional encrypted type you already used in customers */
export const bytea = customType<{
  data: Buffer | null;
  driverData: Buffer | null;
}>({
  dataType() {
    return "bytea";
  },
});

/** customers */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    displayName: text("display_name"),
    email: text("email").notNull(), // recommend not null for Stripe/Link + emails
    phoneEnc: bytea("phone_enc"),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byClerk: index("idx_customers_clerk").on(t.clerkUserId),
    byEmail: index("idx_customers_email").on(t.email),
  })
);

/** orders */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),

    orderNumber: text("order_number").notNull().unique(),
    status: orderStatus("status").notNull().default("submitted"),
    currency: currencyEnum("currency").notNull(), // "USD" | "CAD"

    subtotalCents: integer("subtotal_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    shippingCents: integer("shipping_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),

    placedAt: timestamp("placed_at", { withTimezone: true }),

    provider: text("provider"),      // e.g. "stripe"
    providerId: text("provider_id"), // e.g. stripe session/payment id

    billingAddressId: uuid("billing_address_id").references(
      () => customerAddresses.id,
      { onDelete: "set null" }
    ),
    shippingAddressId: uuid("shipping_address_id").references(
      () => customerAddresses.id,
      { onDelete: "set null" }
    ),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byCustomer: index("idx_orders_customer").on(t.customerId),
    byProviderId: index("idx_orders_provider_id").on(t.providerId),
    byPlacedAt: index("idx_orders_placed_at").on(t.placedAt),
  })
);

/** order items */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    productId: integer("product_id").notNull(),
    productName: text("product_name").notNull(),
    optionChain: text("option_chain"), // optional: serialized chosen option IDs
    unitCents: integer("unit_cents").notNull(),
    qty: integer("qty").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrder: index("idx_order_items_order").on(t.orderId),
  })
);

/** loyalty */
export const loyaltyWallets = pgTable("loyalty_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: "cascade" }),
  pointsBalance: integer("points_balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => loyaltyWallets.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: loyaltyReason("reason").notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byWallet: index("idx_loyalty_wallet").on(t.walletId, t.createdAt),
  })
);
