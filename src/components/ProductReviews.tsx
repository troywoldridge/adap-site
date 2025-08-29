// Server wrapper that fetches approved reviews + stats
import { db } from "@/lib/db";
import { productReviews } from "@/db/schema/productReviews";
import { and, desc, eq, sql } from "drizzle-orm";
import ReviewsClientList from "./ProductReviewsClientList";

export default async function ProductReviews({ productId }: { productId: string }) {
  const rows = await db
    .select()
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.approved, true)))
    .orderBy(desc(productReviews.createdAt))
    .limit(200);

  const [s] = await db
    .select({
      count: sql<number>`count(*)::int`,
      avg: sql<number>`coalesce(avg(rating), 0)`,
      r1: sql<number>`count(*) filter (where rating = 1)`,
      r2: sql<number>`count(*) filter (where rating = 2)`,
      r3: sql<number>`count(*) filter (where rating = 3)`,
      r4: sql<number>`count(*) filter (where rating = 4)`,
      r5: sql<number>`count(*) filter (where rating = 5)`,
    })
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.approved, true)))
    .limit(1);

  return (
    <ReviewsClientList
      productId={productId}
      initialReviews={rows.map(r => ({
        id: r.id, name: r.name, rating: r.rating, comment: r.comment, createdAt: r.createdAt,
      }))}
      stats={{
        count: s?.count ?? 0,
        average: Number(s?.avg ?? 0),
        breakdown: { 1: s?.r1 ?? 0, 2: s?.r2 ?? 0, 3: s?.r3 ?? 0, 4: s?.r4 ?? 0, 5: s?.r5 ?? 0 },
      }}
    />
  );
}
