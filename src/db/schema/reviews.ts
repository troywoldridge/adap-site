// src/db/schema/reviews.ts
import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- Reviews ----------
export const productReviews = pgTable(
  "product_reviews",
  {
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
  },
  (t) => [
    // ✅ these belong to product_reviews
    index("reviews_product_id_idx").on(t.productId),
    index("reviews_approved_idx").on(t.approved),
    // optional but useful:
    index("reviews_rating_idx").on(t.rating),
    index("reviews_created_at_idx").on(t.createdAt),
  ]
);

// ---------- Helpful votes ----------
export const reviewHelpfulVotes = pgTable(
  "review_helpful_votes",
  {
    id: serial("id").primaryKey(),
    reviewId: integer("review_id")
      .notNull()
      .references(() => productReviews.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 64 }),     // optional (logged-in)
    ip: varchar("ip", { length: 48 }),              // optional (anonymous)
    voterFingerprint: varchar("voter_fingerprint", { length: 64 }).notNull(), // ✅ NEW
    isHelpful: boolean("is_helpful").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    // fast lookups
    index("review_helpful_review_idx").on(t.reviewId),
    index("review_helpful_user_idx").on(t.userId),
    // ✅ only one vote per fingerprint per review
    uniqueIndex("uniq_review_helpful_by_fp").on(t.reviewId, t.voterFingerprint),
  ]
);
