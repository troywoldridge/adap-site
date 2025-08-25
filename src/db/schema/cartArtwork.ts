// src/db/schema/cartArtwork.ts
import { pgTable, uuid, integer, text, timestamp } from "drizzle-orm/pg-core";
import { cartLines } from "./cartLines"; // ← correct source

export const cartArtwork = pgTable("cart_artwork", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartLineId: uuid("cart_line_id")
    .notNull()
    .references(() => cartLines.id, { onDelete: "cascade" }),
  side: integer("side").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
