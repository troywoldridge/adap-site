import { pgTable, uuid, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sid: text("sid").notNull(),                    // anonymous session id cookie
  userId: text("user_id"),                       // Clerk userId when signed in
  status: text("status").notNull().default("open"), // open|ordered|abandoned
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
  optionIds: jsonb("option_ids").$type<number[] | null>().default(null), // array of SinaLite option ids
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [
  index("idx_cart_lines_cart").on(t.cartId),
  index("idx_cart_lines_product").on(t.productId),
]);
