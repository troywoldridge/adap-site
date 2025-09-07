import { pgTable, serial, varchar, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const productReviews = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  productId: varchar("product_id", { length: 48 }).notNull(),
  name: varchar("name", { length: 60 }).notNull(),
  email: varchar("email", { length: 80 }),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  approved: boolean("approved").default(false),
  userIp: varchar("user_ip", { length: 45 }),
  termsAgreed: boolean("terms_agreed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  verified: boolean("verified").default(false),
});

export const reviewHelpfulVotes = pgTable("review_helpful_votes", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  userId: varchar("user_id", { length: 64 }),
  ip: varchar("ip", { length: 48 }),
  isHelpful: boolean("is_helpful").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
},
 (t) => [
    index("reviews_product_id_idx").on(t.productId),
    index("reviews_approved_idx").on(t.approved),
  ],
);
