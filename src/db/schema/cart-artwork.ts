import { pgTable, uuid, integer, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cartLines } from "./cart";

export const cartArtwork = pgTable("cart_artwork", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartLineId: uuid("cart_line_id").notNull().references(() => cartLines.id, { onDelete: "cascade" }),
  side: integer("side").notNull(),          // 1,2,3... per-side uploads
  url: text("url").notNull(),               // public R2 URL
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const cartArtworkRelations = relations(cartArtwork, ({ one }) => ({
  line: one(cartLines, {
    fields: [cartArtwork.cartLineId],
    references: [cartLines.id],
  }),
}));
