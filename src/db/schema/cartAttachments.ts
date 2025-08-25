// db/schema/cartAttachments.ts
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { carts } from "./cart";
import { cartLines } from "./cartLines";

export const cartAttachments = pgTable("cart_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  lineId: uuid("line_id").references(() => cartLines.id, { onDelete: "cascade" }),
  key: text("key").notNull(),      // cloudflare image id or storage key
  url: text("url").notNull(),      // cf delivery URL if you store it directly
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
