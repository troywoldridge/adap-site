// src/db/schema/productReviews.ts (or your file path)
import {
  pgTable, uuid, integer, text, timestamp, index, uniqueIndex, boolean as pgBool,
} from "drizzle-orm/pg-core";

export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    productId: integer("product_id").notNull(),
    userId: text("user_id").notNull(),
    rating: integer("rating").notNull().default(5),
    title: text("title"),
    body: text("body"),
    approved: pgBool("approved").notNull().default(false), // ✅ new column
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (t) => [
    index("product_reviews_product_id_idx").on(t.productId),
    index("product_reviews_approved_idx").on(t.approved),     // ✅ index on approved
    index("product_reviews_created_at_idx").on(t.createdAt),   // ✅ sort helper
    index("product_reviews_rating_idx").on(t.rating),          // ✅ sort helper
    uniqueIndex("product_reviews_product_id_user_id_uq").on(t.productId, t.userId),
  ],
);
