import { pgTable, serial, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Legacy upload table (kept for compatibility).
 * Your new canonical artwork storage is order_artwork in orders.ts
 */
export const artworkUploads = pgTable("artwork_uploads", {
  id: serial("id").primaryKey(),
  productId: varchar("product_id", { length: 48 }).notNull(),
  orderId: varchar("order_id", { length: 48 }), // optional
  userId: varchar("user_id", { length: 64 }),   // optional
  fileUrl: varchar("file_url", { length: 255 }).notNull(),
  fileName: varchar("file_name", { length: 128 }).notNull(),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 64 }),
  approved: boolean("approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
