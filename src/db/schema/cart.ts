// db/schema/cart.ts
import { pgTable, uuid, text, integer, timestamp, jsonb, numeric, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sid: text("sid").notNull(),
  userId: text("user_id"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [
  index("idx_carts_sid").on(t.sid),
  index("idx_carts_user").on(t.userId),
  index("idx_carts_status").on(t.status),
]);

export const cartLines = pgTable("cart_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),

  // 🔁 tighten to string[] (Sinalite sends/receives optionIds as strings)
  optionIds: jsonb("option_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),

  quantity: integer("quantity").notNull().default(1),

  // 💰 new: persisted price from Sinalite /price/{productId}/{storeCode}
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),

  // 🧭 new: canonical group -> optionId map from Sinalite's price response
  optionsByGroup: jsonb("options_by_group")
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'::jsonb`),

  // 📦 new: package details (weight/box size/etc.) from Sinalite pricing
  sinalitePackageInfo: jsonb("sinalite_package_info")
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'::jsonb`),

  // already present
  artwork: jsonb("artwork").$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [
  index("idx_cart_lines_cart").on(t.cartId),
  index("idx_cart_lines_product").on(t.productId),
  // Optional: search/filter by price later
  index("idx_cart_lines_unit_price").on(t.unitPrice),
]);
