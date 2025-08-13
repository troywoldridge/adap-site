// app/products/[productId]/reviews/helpful/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productReviews, reviewHelpfulVotes } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const { productId } = params;

  // 1) Get approved review IDs for this product
  const reviews = await db
    .select({ id: productReviews.id })
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.approved, true)));

  const ids = reviews.map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({});
  }

  // 2) Aggregate helpful / not-helpful counts per review via Drizzle + sql<>
  const votes = await db
    .select({
      reviewId: reviewHelpfulVotes.reviewId,
      helpful: sql<number>`SUM(CASE WHEN ${reviewHelpfulVotes.isHelpful} THEN 1 ELSE 0 END)`,
      notHelpful: sql<number>`SUM(CASE WHEN ${reviewHelpfulVotes.isHelpful} THEN 0 ELSE 1 END)`,
    })
    .from(reviewHelpfulVotes)
    .where(inArray(reviewHelpfulVotes.reviewId, ids))
    .groupBy(reviewHelpfulVotes.reviewId);

  // 3) Shape as { [reviewId]: { helpful, notHelpful } }
  const map: Record<number, { helpful: number; notHelpful: number }> = {};
  for (const v of votes) {
    map[v.reviewId] = { helpful: Number(v.helpful), notHelpful: Number(v.notHelpful) };
  }

  return NextResponse.json(map);
}
