// app/products/[productId]/reviews/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productReviews } from "@/db/schema/productReviews"; // adjust path if different
import { and, asc, desc, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore() {
  return { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };
}

// GET: Fetch approved reviews for a product with sort & pagination
export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productIdNum = Number(params.productId);
    if (!Number.isFinite(productIdNum)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 422, headers: noStore() });
    }

    const { searchParams } = new URL(req.url);
    const sort = (searchParams.get("sort") || "latest").toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "5", 10)));
    const offset = (page - 1) * pageSize;

    // Build orderBy with Drizzle helpers
    const orderBy =
      sort === "oldest"
        ? asc(productReviews.createdAt)
        : sort === "highest"
        ? desc(productReviews.rating)
        : sort === "lowest"
        ? asc(productReviews.rating)
        : desc(productReviews.createdAt); // "latest" default

    // Query rows
    const reviews = await db
      .select()
      .from(productReviews)
      .where(and(eq(productReviews.productId, productIdNum), eq(productReviews.approved, true)))
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset);

    // Count total for pagination (cast to int for convenience)
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(productReviews)
      .where(and(eq(productReviews.productId, productIdNum), eq(productReviews.approved, true)));

    return NextResponse.json(
      { reviews, total: count, page, pageSize },
      { status: 200, headers: noStore() },
    );
  } catch (err: any) {
    const msg = String(err?.message || "Failed to load reviews");
    return NextResponse.json({ error: msg }, { status: 400, headers: noStore() });
  }
}
