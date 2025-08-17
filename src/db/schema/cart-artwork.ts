// src/db/schema/cart-artwork.ts
import { pgTable, uuid, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { cartLines } from "./cart";

/**
 * One row per cart line + side (e.g., side 1, side 2) with a public URL.
 * cart_lines.id is UUID in your schema, so we use UUID here too.
 */
export const cartArtwork = pgTable(
  "cart_artwork",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    cartLineId: uuid("cart_line_id")
      .notNull()
      .references(() => cartLines.id, { onDelete: "cascade" }),

    side: integer("side").notNull(), // 1, 2, 3...
    url: text("url").notNull(),

    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_cart_artwork_line").on(t.cartLineId),
    index("idx_cart_artwork_line_side").on(t.cartLineId, t.side),
  ]
);
