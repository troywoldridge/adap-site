import { pgTable, text, integer, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Wallets: 1 per customer
export const loyaltyWallets = pgTable(
  "loyalty_wallets",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    customerId: text("customer_id").notNull(),              // FK to your customers table (text/uuid/int — match your customers.id type)
    pointsBalance: integer("points_balance").notNull().default(0),
    lifetimeEarned: integer("lifetime_earned").notNull().default(0),
    lifetimeRedeemed: integer("lifetime_redeemed").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("idx_wallets_customer").on(t.customerId)],
);

// Transactions: earn/redeem/adjust
export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    customerId: text("customer_id").notNull(),
    walletId: uuid("wallet_id").notNull(),
    type: text("type").notNull(),              // 'earn' | 'redeem' | 'adjust'
    points: integer("points").notNull(),       // positive for earn, negative for redeem/adjust down
    source: text("source").notNull().default("manual"), // 'order' | 'manual' | 'admin' | 'refund'
    orderId: text("order_id"),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_txn_customer").on(t.customerId),
    index("idx_txn_wallet").on(t.walletId),
    index("idx_txn_order").on(t.orderId),
  ],
);
