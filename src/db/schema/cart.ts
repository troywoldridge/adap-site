/* eslint-disable @typescript-eslint/no-explicit-any */
import { pgTable, text, integer, timestamp, jsonb, uuid, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const cartStatusEnum = pgEnum("cart_status", ["open", "submitted", "abandoned"]);

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sid: text("sid").notNull(),                         // session cookie value
  status: cartStatusEnum("status").notNull().default("open"),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export const cartLines = pgTable("cart_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  optionIds: jsonb("option_ids").$type<number[]>().notNull().default([] as unknown as number[]),
  // Optional per-line JSON map like { "1": "https://..." }
  artwork: jsonb("artwork").$type<Record<string, string> | null>().default(null),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});

export const cartsRelations = relations(carts, ({ many }) => ({
  lines: many(cartLines),
}));

export const cartLinesRelations = relations(cartLines, ({ one }) => ({
  cart: one(carts, {
    fields: [cartLines.cartId],
    references: [carts.id],
  }),
}));
