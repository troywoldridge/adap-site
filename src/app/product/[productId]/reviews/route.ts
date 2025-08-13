import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productReviews } from "@/db/schema";

// GET: Fetch all approved reviews for this product, with sort & pagination
export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const { productId } = params;
  const { searchParams } = new URL(req.url);

  // Sort options
  const sort = searchParams.get("sort") || "latest";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "5", 10);

  let orderBy;
  if (sort === "oldest") {
    orderBy = productReviews.createdAt.asc();
  } else if (sort === "highest") {
           orderBy = productReviews.rating.desc();
         } else if (sort === "lowest") {
                  orderBy = productReviews.rating.asc();
                } else {
                  orderBy = productReviews.createdAt.desc();
                } // latest default

  const offset = (page - 1) * pageSize;

  const [reviews, [{ count }]] = await Promise.all([
    db
      .select()
      .from(productReviews)
      .where(productReviews.productId.eq(productId))
      .where(productReviews.approved.eq(true))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db.execute(
      `SELECT COUNT(*)::int AS count FROM product_reviews WHERE product_id = $1 AND approved = TRUE`,
      [productId]
    ),
  ]);

  return NextResponse.json({ reviews, total: count });
}
