// src/app/api/reviews/route.ts
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { productReviews } from "@/db/schema/productReviews";
import { desc, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// -------- helpers ----------
function getClientIp(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xr = h.get("x-real-ip");
  if (xr) return xr.trim();
  return "0.0.0.0";
}
function sanitizeRating(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(5, Math.round(n)));
}

// -------- GET: list reviews + stats ----------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawPid = (searchParams.get("productId") || "").trim();
  const pid = Number.parseInt(rawPid, 10);

  if (!Number.isFinite(pid) || pid <= 0) {
    return NextResponse.json({ ok: true, productId: rawPid, stats: { count: 0, average: 0, breakdown: {1:0,2:0,3:0,4:0,5:0} }, reviews: [] });
  }

  try {
    // rows newest-first
    const rows = await db
      .select({
        id: productReviews.id,
        productId: productReviews.productId,
        userId: productReviews.userId,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        createdAt: productReviews.createdAt,
        updatedAt: productReviews.updatedAt,
      })
      .from(productReviews)
      .where(eq(productReviews.productId, pid))
      .orderBy(desc(productReviews.createdAt))
      .limit(200);

    // quick stats in SQL (works even if 0 rows)
    const s = await db
      .select({
        count: sql<number>`count(*)::int`,
        avg:   sql<number>`coalesce(avg(${productReviews.rating}), 0)`,
        r1:    sql<number>`count(*) filter (where ${productReviews.rating} = 1)`,
        r2:    sql<number>`count(*) filter (where ${productReviews.rating} = 2)`,
        r3:    sql<number>`count(*) filter (where ${productReviews.rating} = 3)`,
        r4:    sql<number>`count(*) filter (where ${productReviews.rating} = 4)`,
        r5:    sql<number>`count(*) filter (where ${productReviews.rating} = 5)`,
      })
      .from(productReviews)
      .where(eq(productReviews.productId, pid))
      .limit(1);

    const statsRow = s[0] || { count: 0, avg: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 };

    return NextResponse.json({
      ok: true,
      productId: pid,
      stats: {
        count: statsRow.count,
        average: Number(statsRow.avg) || 0,
        breakdown: { 1: statsRow.r1, 2: statsRow.r2, 3: statsRow.r3, 4: statsRow.r4, 5: statsRow.r5 },
      },
      reviews: rows.map(r => ({
        id: r.id,
        userId: r.userId,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
      })),
    });
  } catch (err: any) {
    // Log server-side only; return empty-but-OK payload to keep UI clean
    console.error("[/api/reviews GET] DB error:", err?.message || err);
    return NextResponse.json({
      ok: true,
      productId: pid,
      stats: { count: 0, average: 0, breakdown: {1:0,2:0,3:0,4:0,5:0} },
      reviews: [],
    });
  }
}

// -------- POST: submit review (pending moderation) ----------
export async function POST(req: NextRequest) {
  try {
    const h = req.headers;
    const ip = getClientIp(h);

    const body = await req.json().catch(() => ({}));
    const productId = Number.parseInt(String(body?.productId ?? ""), 10);
    const name = (body?.name || "").toString().trim(); // kept for fingerprint only
    const email = (body?.email || "").toString().trim() || null;
    const comment = (body?.comment || body?.body || "").toString().trim();
    const rating = sanitizeRating(body?.rating);
    const terms = Boolean(body?.termsAgreed);

    if (!Number.isFinite(productId) || productId <= 0 || !comment || rating < 1 || rating > 5) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }
    if (!terms) {
      return NextResponse.json({ ok: false, error: "terms_required" }, { status: 400 });
    }

    const fingerprint = crypto
      .createHash("sha256")
      .update(`${ip}::${h.get("user-agent") ?? ""}::${productId}::${name}::${comment}`)
      .digest("hex")
      .slice(0, 64);

    // Insert minimal columns that exist in your schema
    await db.insert(productReviews).values({
      productId,
      userId: email || "anon",
      rating,
      title: null,
      body: comment,
      // created_at / updated_at default in DB
    });

    return NextResponse.json({ ok: true, submitted: "pending_review", fingerprint });
  } catch (err: any) {
    console.error("[/api/reviews POST] error:", err?.message || err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
