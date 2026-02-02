// app/products/[productId]/reviews/helpful/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { dbClient as db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore() {
  return { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productIdNum = Number(params.productId);
    if (!Number.isFinite(productIdNum)) {
      return NextResponse.json(
        { error: "Invalid productId" },
        { status: 422, headers: noStore() }
      );
    }

    // 1) Fetch review IDs for this product
    //    Note: we’re not filtering by approval because your schema doesn’t have `approved`;
    //    if you confirm the column name (e.g. is_approved or status='approved'), we’ll add it.
    const reviewsRes = await db.execute(
      sql/* sql */`
        SELECT id
        FROM product_reviews
        WHERE product_id = ${productIdNum}
      `
    );

    const ids: (string | number)[] = (reviewsRes.rows ?? []).map((r: any) => r.id);
    if (!ids.length) {
      return NextResponse.json({}, { status: 200, headers: noStore() });
    }

    // Helper for building a VALUES list safely
    // drizzle-orm's sql`` supports array params via ANY($1), but
    // not all drivers support uuid[] vs int[] seamlessly; we’ll use VALUES.
    const valuesSql = sql.join(
      ids.map((id) => sql`(${id})`),
      sql`,`
    );

    // 2) Try the preferred aggregation using `is_helpful` (snake_case)
    //    If the column does not exist, catch and fallback to total counts only.
    try {
      const votesRes = await db.execute(
        sql/* sql */`
          WITH review_ids(id) AS (
            VALUES ${valuesSql}
          )
          SELECT
            v.review_id AS review_id,
            SUM(CASE WHEN v.is_helpful THEN 1 ELSE 0 END) AS helpful,
            SUM(CASE WHEN v.is_helpful THEN 0 ELSE 1 END) AS not_helpful
          FROM review_helpful_votes v
          JOIN review_ids r ON r.id = v.review_id
          GROUP BY v.review_id
        `
      );

      const map: Record<string, { helpful: number; notHelpful: number }> = {};
      for (const row of votesRes.rows as any[]) {
        const key = String(row.review_id);
        map[key] = {
          helpful: Number(row.helpful ?? 0),
          notHelpful: Number(row.not_helpful ?? 0),
        };
      }
      return NextResponse.json(map, { status: 200, headers: noStore() });
    } catch {
      // 2b) Fallback: if `is_helpful` column doesn't exist, just return total counts.
      const votesRes = await db.execute(
        sql/* sql */`
          WITH review_ids(id) AS (
            VALUES ${valuesSql}
          )
          SELECT
            v.review_id AS review_id,
            COUNT(*) AS total
          FROM review_helpful_votes v
          JOIN review_ids r ON r.id = v.review_id
          GROUP BY v.review_id
        `
      );

      const map: Record<string, { helpful: number; notHelpful: number }> = {};
      for (const row of votesRes.rows as any[]) {
        const key = String(row.review_id);
        const total = Number(row.total ?? 0);
        map[key] = { helpful: total, notHelpful: 0 };
      }
      return NextResponse.json(map, { status: 200, headers: noStore() });
    }
  } catch (err: any) {
    const msg = String(err?.message || "Failed to load helpful votes");
    return NextResponse.json({ error: msg }, { status: 400, headers: noStore() });
  }
}

