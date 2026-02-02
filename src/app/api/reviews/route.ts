import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { productReviews } from "@/lib/db/schema/productReviews";
import { desc, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- helpers ---------------- */

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

/* ---------------- GET ---------------- */

export async function GET(req: NextRequest) {
  const database = db;
  const { searchParams } = new URL(req.url);
  const rawPid = (searchParams.get("productId") || "").trim();
  const pid = Number.parseInt(rawPid, 10);

  if (!Number.isFinite(pid) || pid <= 0) {
    return NextResponse.json({
      ok: true,
      productId: rawPid,
      stats: { count: 0, average: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      reviews: [],
    });
  }

  try {
    const rows = await database
      .select({
        id: productReviews.id,
        productId: productReviews.productId,
        userId: productReviews.userId,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        createdAt: productReviews.createdAt,
      })
      .from(productReviews)
      .where(eq(productReviews.productId, pid))
      .orderBy(desc(productReviews.createdAt))
      .limit(200);

    const [statsRow] =
      (await database
        .select({
          count: sql<number>`count(*)::int`,
          avg: sql<number>`coalesce(avg(${productReviews.rating}), 0)`,
          r1: sql<number>`count(*) filter (where ${productReviews.rating} = 1)`,
          r2: sql<number>`count(*) filter (where ${productReviews.rating} = 2)`,
          r3: sql<number>`count(*) filter (where ${productReviews.rating} = 3)`,
          r4: sql<number>`count(*) filter (where ${productReviews.rating} = 4)`,
          r5: sql<number>`count(*) filter (where ${productReviews.rating} = 5)`,
        })
        .from(productReviews)
        .where(eq(productReviews.productId, pid))
        .limit(1)) ?? [];

    const s = statsRow ?? { count: 0, avg: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 };

    return NextResponse.json({
      ok: true,
      productId: pid,
      stats: {
        count: s.count,
        average: Number(s.avg) || 0,
        breakdown: { 1: s.r1, 2: s.r2, 3: s.r3, 4: s.r4, 5: s.r5 },
      },
      reviews: rows,
    });
  } catch (err) {
    console.error("[reviews GET]", err);
    return NextResponse.json({
      ok: true,
      productId: pid,
      stats: { count: 0, average: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      reviews: [],
    });
  }
}

/* ---------------- POST ---------------- */

export async function POST(req: NextRequest) {
  const database = db;
  try {
    const ip = getClientIp(req.headers);
    const body = await req.json().catch(() => ({}));

    const productId = Number(body?.productId);
    const comment = String(body?.comment || body?.body || "").trim();
    const rating = sanitizeRating(body?.rating);
    const email = String(body?.email || "anon");

    if (!productId || !comment || rating < 1) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    const fingerprint = crypto
      .createHash("sha256")
      .update(`${ip}:${productId}:${comment}`)
      .digest("hex");

    await database.insert(productReviews).values({
      productId,
      userId: email,
      rating,
      title: null,
      body: comment,
    });

    return NextResponse.json({ ok: true, fingerprint });
  } catch (err) {
    console.error("[reviews POST]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
