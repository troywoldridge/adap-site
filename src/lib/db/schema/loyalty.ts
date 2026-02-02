// src/db/schema/loyalty.ts
import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders } from "./orders"; // adjust path if yours differs

/* Enum */
export const loyaltyReason = pgEnum("loyalty_reason", [
  "purchase",
  "refund",
  "adjustment",
  "signup",
  "promotion",
]);

/* Wallets: 1 row per customer (we store Clerk user id in customerId as TEXT) */
export const loyaltyWallets = pgTable(
  "loyalty_wallets",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    customerId: text("customer_id").notNull(),
    pointsBalance: integer("points_balance").notNull().default(0),
    lifetimeEarned: integer("lifetime_earned").notNull().default(0),
    lifetimeRedeemed: integer("lifetime_redeemed").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uniq_loyalty_wallet_by_customer").on(t.customerId),
    index("idx_wallets_customer").on(t.customerId),
  ],
);

/* Transactions */
export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => loyaltyWallets.id, { onDelete: "cascade" }),
    customerId: text("customer_id").notNull(), // Clerk user id for fast lookups
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    delta: integer("delta").notNull(), // use 'delta' (positive=earn, negative=redeem)
    reason: loyaltyReason("reason").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_txn_customer").on(t.customerId),
    index("idx_txn_wallet").on(t.walletId),
    index("idx_txn_order").on(t.orderId),
  ],
);
