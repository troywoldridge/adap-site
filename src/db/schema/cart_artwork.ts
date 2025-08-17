// src/db/schema/cart_artwork.ts
import { pgTable, uuid, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { cartLines } from "./cart";

export const cartArtwork = pgTable("cart_artwork", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  lineId: uuid("line_id").notNull().references(() => cartLines.id, { onDelete: "cascade" }),
  side: integer("side").notNull().default(1), // 1-based: 1,2,...
  url: text("url").notNull(),                 // Cloudflare public image URL
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
}, (t) => [
  index("idx_art_line").on(t.lineId),
  index("idx_art_side").on(t.side),
]);
