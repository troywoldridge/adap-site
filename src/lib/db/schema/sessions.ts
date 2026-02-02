// src/db/schema/sessions.ts
import { pgTable, uuid, varchar, jsonb, numeric, timestamp } from "drizzle-orm/pg-core";

/**
 * order_sessions
 * Ephemeral cart/checkout session tied to a product.
 */
export const orderSessions = pgTable("order_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 64 }),

  productId: varchar("product_id", { length: 64 }).notNull(),

  options: jsonb("options").$type<(number | string)[] | Record<string, any>>().notNull().default([]),
  files: jsonb("files").$type<{ type: string; url: string }[]>().notNull().default([]),

  shippingInfo: jsonb("shipping_info").$type<Record<string, any> | null>(),
  billingInfo: jsonb("billing_info").$type<Record<string, any> | null>(),

  trackingUrl: varchar("tracking_url", { length: 255 }),

  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  subtotal: numeric("subtotal").notNull().default("0"),
  tax: numeric("tax").notNull().default("0"),
  discount: numeric("discount").notNull().default("0"),
  total: numeric("total").notNull().default("0"),

  // [carrier, method, price, days]
  selectedShippingRate: jsonb("selected_shipping_rate").$type<[string, string, number, number] | null>(),

  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 128 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 128 }),

  sinaliteOrderId: varchar("sinalite_order_id", { length: 64 }),

  notes: varchar("notes", { length: 1000 }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
