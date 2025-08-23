import { pgTable, text, jsonb, uuid, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  sid: text("sid").notNull(),
  status: text("status").notNull().default("open"),
  userId: text("user_id"),
  selectedShipping: jsonb("selected_shipping").$type<SelectedShipping | null>().default(null),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SelectedShipping = {
  carrier: string;        // "UPS" | "Federal Express" | ...
  method: string;         // "UPS Standard" | ...
  cost: number;           // numeric cost
  days: number | null;    // business days if provided
  currency: "USD" | "CAD";
  country: "US" | "CA";
  state: string;
  zip: string;
};

export const cartLines = pgTable("cart_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  optionIds: jsonb("option_ids").$type<number[]>().notNull().default([]),
  artwork: jsonb("artwork").$type<Record<string, string> | null>().default(null),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cartAttachments = pgTable("cart_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").notNull(),
  lineId: uuid("line_id"),
  key: text("key").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cartArtwork = pgTable("cart_artwork", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartLineId: uuid("cart_line_id").notNull(),
  side: integer("side").notNull(),
  url: text("url").notNull(),
});

export const cartsRelations = relations(carts, ({ many }) => ({
  lines: many(cartLines),
}));

export const cartLinesRelations = relations(cartLines, ({ /* one */ }) => ({}));

export type Cart = typeof carts.$inferSelect;
export type CartLine = typeof cartLines.$inferSelect;
