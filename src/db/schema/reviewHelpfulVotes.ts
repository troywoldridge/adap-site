import {
  pgTable, uuid, integer, varchar, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { productReviews } from "./productReviews";

export const reviewHelpfulVotes = pgTable(
  "review_helpful_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reviewId: integer("review_id")
      .notNull()
      .references(() => productReviews.id, { onDelete: "cascade" }),
    voterFingerprint: varchar("voter_fingerprint", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uqByReviewVoter: uniqueIndex("uq_helpful_review_voter").on(
      t.reviewId,
      t.voterFingerprint
    ),
    byReview: index("idx_helpful_by_review").on(t.reviewId),
  })
);
