import {
  pgTable, uuid, integer, text, timestamp, index, uniqueIndex,
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
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  (t) => [
    // ✅ unique names
    index("product_reviews_product_id_idx").on(t.productId),
    index("product_reviews_approved_idx").on(t.rating), // or your real "approved" column
    uniqueIndex("product_reviews_product_id_user_id_uq").on(t.productId, t.userId),
  ],
);
