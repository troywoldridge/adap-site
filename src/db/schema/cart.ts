import { pgTable, uuid, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sid: text("sid").notNull(),                       // anonymous session id cookie
  userId: text("user_id"),                          // Clerk userId when signed in
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
  optionIds: jsonb("option_ids").$type<number[] | null>().default(null), // ordered SinaLite option ids
  quantity: integer("quantity").notNull().default(1),
  // Artwork thumbnails per side: {"1":"https://...","2":"https://..."}
  artwork: jsonb("artwork").$type<Record<string, string> | null>().default(null),

  // Optional persisted price (unit):
  // unitPrice: numeric("unit_price"), currency: text("currency"),

  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [
  index("idx_cart_lines_cart").on(t.cartId),
  index("idx_cart_lines_product").on(t.productId),
  // If you want a quick unique merge key, you can add a composite index of (cartId, productId) plus optionIds hashing, but leave this simple for now.
]);

// (Optional) PostgreSQL constraint for positive quantity:
// ALTER TABLE cart_lines ADD CONSTRAINT quantity_positive CHECK (quantity >= 1);

// (Optional) Trigger to bump updatedAt on UPDATE (if you like DB-side):
// create function touch_updated_at() returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
// create trigger trig_touch_cart before update on carts for each row execute function touch_updated_at();
// create trigger trig_touch_cart_lines before update on cart_lines for each row execute function touch_updated_at();
