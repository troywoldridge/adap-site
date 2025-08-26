// src/db/schema/reviewHelpfulVotes.ts
import { pgTable, uuid, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { productReviews } from "./productReviews"; // ← adjust path if your file is elsewhere

export const reviewHelpfulVotes = pgTable(
  "review_helpful_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => productReviews.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 64 }),
    ip: varchar("ip", { length: 48 }),
    isHelpful: boolean("is_helpful").notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (t) => [
    index("idx_review_votes_review").on(t.reviewId),
  ],
);
