import {
  pgTable, serial, varchar, integer, text, boolean, timestamp, index,
} from "drizzle-orm/pg-core";

export const productReviews = pgTable(
  "product_reviews",
  {
    id: serial("id").primaryKey(),
    productId: varchar("product_id", { length: 48 }).notNull(),
    name: varchar("name", { length: 60 }).notNull(),
    email: varchar("email", { length: 80 }),
    rating: integer("rating").notNull(), // UI should still enforce 1–5
    comment: text("comment").notNull(),
    approved: boolean("approved").notNull().default(false),
    userIp: varchar("user_ip", { length: 45 }),
    termsAgreed: boolean("terms_agreed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    idxByProduct: index("idx_reviews_product").on(t.productId),
    idxApproved: index("idx_reviews_approved").on(t.approved),
  })
);
