import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { carts } from "./cart";

export const cartCredits = pgTable(
  "cart_credits",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("loyalty"), // 'loyalty' | 'promo' | ...
    amountCents: integer("amount_cents").notNull(),       // store credit as positive cents; applied as negative to totals
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("idx_cart_credits_cart").on(t.cartId)],
);
