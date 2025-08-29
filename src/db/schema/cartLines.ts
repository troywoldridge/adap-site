// src/db/schema/cartLines.ts
import {
  pgTable, uuid, integer, jsonb, timestamp, index, text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// IMPORTANT: adjust this import path to wherever your carts table is exported.
// If your build alias is "@/db/schema/cart", keep it; otherwise use a relative path like "../../db/schema/cart".
import { carts } from "@/db/schema/cart";

export const cartLines = pgTable(
  "cart_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Strong FK to carts.id so deletes cascade cleanly
    cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),

    productId: integer("product_id").notNull(),

    quantity: integer("quantity").notNull().default(1),

    // Store option value IDs (the exact chain sent to Sinalite /price and /order/shippingEstimate)
    optionIds: jsonb("option_ids").$type<number[]>().notNull().default([]),

    // Optional: persisted artwork metadata (R2 object keys, etc.)
    artwork: jsonb("artwork").$type<Record<string, string> | null>().default(null),

    // 💸 Money in cents (snapshot the unit price from Sinalite /price)
    unitPriceCents: integer("unit_price_cents").notNull().default(0),

    // Precomputed line total in cents so the Review page doesn’t recalc on the fly
    lineTotalCents: integer("line_total_cents").notNull().default(0),

    // If you ever re-price later, keep what we used
    pricedOptionIds: jsonb("priced_option_ids").$type<number[] | null>().default(null),

    // Optional: a normalized option chain string for uniqueness (e.g., "30-4-105-93-540-140")
    optionChain: text("option_chain").default(null),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_cart_lines_cart").on(t.cartId),
    index("idx_cart_lines_product").on(t.productId),
    // If you want 1 line per unique (cart, product, chain), add a unique index:
    // unique("uq_cart_product_chain").on(t.cartId, t.productId, t.optionChain)
  ]
);

// NOTE:
// - Keep all price math in cents server-side (unitPriceCents * quantity => lineTotalCents).
// - The UI can format to dollars for display.
// - Images are NOT stored here; serve via Cloudflare Images CDN using your productAssets/images JSON mappings:
//   https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/public
