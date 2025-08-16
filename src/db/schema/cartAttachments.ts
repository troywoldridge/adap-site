// src/db/schema/cartAttachments.ts
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const cartAttachments = pgTable(
  "cart_attachments",
  {
    id: serial("id").primaryKey().notNull(),
    lineId: text("line_id").notNull(),          // cart line identifier (string/uuid)
    productId: integer("product_id").notNull(), // FK to products.id
    storageId: text("storage_id").notNull(),    // Cloudflare/R2 image id
    fileName: text("file_name").notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_cart_attachments_line").on(t.lineId),
    uniqueIndex("ux_cart_attachments_line_storage").on(t.lineId, t.storageId),
  ]
);
