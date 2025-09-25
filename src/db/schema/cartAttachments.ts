import { pgTable, text, uuid, timestamp, integer, uniqueIndex, index } from "drizzle-orm/pg-core";
import { carts } from "./cart";
import { cartLines } from "./cartLines";

export const cartAttachments = pgTable(
  "cart_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    cartId: uuid("cart_id").references(() => carts.id, { onDelete: "cascade" }),
    lineId: uuid("line_id").references(() => cartLines.id, { onDelete: "cascade" }),

    productId: integer("product_id").notNull(),
    fileName: text("file_name").notNull(),

    key: text("key").notNull(),   // original file key (R2)
    url: text("url").notNull(),   // original file public URL (CF CDN preferred)

    // NEW: thumbnail / preview fields (all optional)
    thumbKey: text("thumb_key"),
    thumbUrl: text("thumb_url"),  // public URL for the thumbnail (CF CDN)
    cfImageId: text("cf_image_id"), // if you later upload thumb to Cloudflare Images

    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  },
  (t) => ({
    lineKeyUnique: uniqueIndex("cart_attachments_line_key_uq").on(t.lineId, t.key),
    cartIdx: index("cart_attachments_cart_id_idx").on(t.cartId),
    lineIdx: index("cart_attachments_line_id_idx").on(t.lineId),
  })
);
