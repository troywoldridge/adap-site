import { pgTable, serial, integer, text, timestamp, numeric, index, varchar } from "drizzle-orm/pg-core";

/* ORDERS */
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey().notNull(),
    userId: text("user_id").notNull(), // Clerk user id
    status: text("status").notNull().default("draft"),
    total: numeric("total"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (t) => [index("idx_orders_user").on(t.userId)],
);

/* ORDER ITEMS */
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey().notNull(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull(),
    quantity: integer("quantity").notNull().default(1),
    optionChain: text("option_chain"),
    pricingHash: text("pricing_hash"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (t) => [
    index("idx_order_items_order").on(t.orderId),
    index("idx_order_items_product").on(t.productId),
  ],
);

export const orderArtwork = pgTable(
  "order_artwork",
  {
    id: serial("id").primaryKey().notNull(),

    orderSessionId: varchar("order_session_id", { length: 64 }),

    // ⬇️ MUST be nullable (NO .notNull())
    orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }),
    orderItemId: integer("order_item_id"),

    productId: integer("product_id").notNull(),
    sideIndex: integer("side_index").notNull().default(0),

    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    storageKey: text("storage_key").notNull(),
    bucket: text("bucket").notNull(),
    publicUrl: text("public_url").notNull(),
    sinaliteJobId: text("sinalite_job_id"),
    sinaliteAssetId: text("sinalite_asset_id"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  }
);

