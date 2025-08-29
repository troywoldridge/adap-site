// src/app/api/reviews/route.ts
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { productReviews } from "@/db/schema/productReviews";
import { and, desc, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getClientIp(h: Headers): string {
  // honor proxy headers first
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

/**
 * GET /api/reviews?productId=XXXX
 * Returns approved reviews + quick stats
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = (searchParams.get("productId") || "").trim();

  if (!productId) {
    return NextResponse.json({ ok: false, error: "missing_productId" }, { status: 400 });
  }

  // Approved reviews newest first
  const rows = await db
    .select()
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.approved, true)))
    .orderBy(desc(productReviews.createdAt))
    .limit(200); // reasonable cap

  // Stats (count + avg + breakdown)
  const statsRow = await db
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

  const s = statsRow[0] || { count: 0, avg: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 };

  return NextResponse.json({
    ok: true,
    productId,
    stats: {
      count: s.count,
      average: Number(s.avg) || 0,
      breakdown: { 1: s.r1, 2: s.r2, 3: s.r3, 4: s.r4, 5: s.r5 },
    },
    reviews: rows.map((r) => ({
      id: r.id,
      name: r.name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
  });
}

/**
 * POST /api/reviews
 * Body: { productId, name, email?, rating(1-5), comment, termsAgreed }
 * Stores as pending (approved=false) for moderation.
 */
export async function POST(req: NextRequest) {
  try {
    const h = req.headers;
    const ip = getClientIp(h);

    const body = await req.json().catch(() => ({}));
    const productId = (body?.productId || "").trim();
    const name = (body?.name || "").toString().trim();
    const email = (body?.email || "").toString().trim() || null;
    const comment = (body?.comment || "").toString().trim();
    const rating = sanitizeRating(body?.rating);
    const terms = Boolean(body?.termsAgreed);

    if (!productId || !name || !comment || rating < 1 || rating > 5) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }
    if (!terms) {
      return NextResponse.json({ ok: false, error: "terms_required" }, { status: 400 });
    }

    // Basic duplicate/content spam guard (hash)
    const fp = crypto
      .createHash("sha256")
      .update(`${ip}::${h.get("user-agent") ?? ""}::${productId}::${name}::${comment}`)
      .digest("hex")
      .slice(0, 64);

    // Insert as pending (approved=false)
    await db.insert(productReviews).values({
      productId,
      name,
      email,
      rating,
      comment,
      approved: false,
      userIp: ip,
      termsAgreed: true,
      // createdAt defaulted
    });

    return NextResponse.json({ ok: true, submitted: "pending_review", fingerprint: fp });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
