import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productReviews, reviewHelpfulVotes } from "@/db/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const { productId } = params;
  // Get all approved review IDs for this product
  const reviews = await db
    .select({ id: productReviews.id })
    .from(productReviews)
    .where(productReviews.productId.eq(productId))
    .where(productReviews.approved.eq(true));

  const ids = reviews.map((r) => r.id);

  if (!ids.length) {
    return NextResponse.json({});
  }

  // For each review, count helpful/not-helpful
  const voteRows = await db.execute(
    `SELECT review_id, 
            SUM(CASE WHEN is_helpful THEN 1 ELSE 0 END) AS helpful, 
            SUM(CASE WHEN is_helpful THEN 0 ELSE 1 END) AS not_helpful
      FROM review_helpful_votes
      WHERE review_id = ANY($1)
      GROUP BY review_id`,
    [ids]
  );
  // Shape as: { [reviewId]: { helpful: x, notHelpful: y } }
  const map = {};
  for (const v of voteRows) {
    map[v.review_id] = { helpful: Number(v.helpful), notHelpful: Number(v.not_helpful) };
  }
  return NextResponse.json(map);
}
