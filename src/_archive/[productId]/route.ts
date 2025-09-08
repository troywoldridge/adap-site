import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { productReviews, reviewHelpfulVotes } from "@/db/schema/reviews";
import { and, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getClientIp(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xr = h.get("x-real-ip");
  if (xr) return xr.trim();
  return "0.0.0.0";
}

function isEmail(s: string) {
  // intentionally light; we just want obvious sanity
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

const MAX_NAME = 60;
const MAX_EMAIL = 80;
const MAX_COMMENT = 2000;

// ---- POST: submit a review ----
export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = (params.productId || "").trim();
    if (!productId) {
      return NextResponse.json({ ok: false, error: "invalid_product_id" }, { status: 400 });
    }

    const { userId } = await auth(); // optional; we don’t store on table yet
    const ip = getClientIp(req.headers);
    const ua = req.headers.get("user-agent") ?? "";

    const body = await req.json().catch(() => ({}));
    let { name, email, rating, comment, termsAgreed } = body ?? {};

    // Normalize
    name = (name ?? "").toString().trim();
    email = (email ?? "").toString().trim();
    comment = (comment ?? "").toString().trim();
    rating = Number(rating);

    // Validate
    if (name.length < 2 || name.length > MAX_NAME) {
      return NextResponse.json({ ok: false, error: "invalid_name" }, { status: 400 });
    }
    if (email && (!isEmail(email) || email.length > MAX_EMAIL)) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ ok: false, error: "invalid_rating" }, { status: 400 });
    }
    if (comment.length < 5 || comment.length > MAX_COMMENT) {
      return NextResponse.json({ ok: false, error: "invalid_comment" }, { status: 400 });
    }
    if (termsAgreed !== true) {
      return NextResponse.json({ ok: false, error: "terms_required" }, { status: 400 });
    }

    // Light anti-spam:
    // 1) limit one submission per product+IP within 8h
    const [{ recent }] =
      (await db
        .select({
          recent: sql<number>`
            count(*)::int
          `,
        })
        .from(productReviews)
        .where(
          and(
            eq(productReviews.productId, productId),
            eq(productReviews.userIp, ip),
            sql`product_reviews.created_at > NOW() - INTERVAL '8 hours'`
          )
        )) ?? [{ recent: 0 }];

    if (recent > 0) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    // 2) quick duplicate body guard (same comment hash on same product in 7d)
    const bodyHash = crypto.createHash("sha256").update(comment).digest("hex");
    const [{ dup }] =
      (await db
        .select({
          dup: sql<number>`
            count(*)::int
          `,
        })
        .from(productReviews)
        .where(
          and(
            eq(productReviews.productId, productId),
            sql`product_reviews.created_at > NOW() - INTERVAL '7 days'`,
            // cheap content similarity: same exact text
            sql`md5(${productReviews.comment}) = md5(${comment})`
          )
        )) ?? [{ dup: 0 }];

    if (dup > 0) {
      return NextResponse.json({ ok: false, error: "duplicate_content" }, { status: 409 });
    }

    // Optional auto-approve via env (default off)
    const approvedFlag = process.env.REVIEWS_AUTO_APPROVE === "true";

    // Insert
    const [row] = await db
      .insert(productReviews)
      .values({
        productId,
        name,
        email: email || null,
        rating,
        comment,
        approved: approvedFlag,
        userIp: ip,
        termsAgreed: true,
        verified: false, // can flip later when we wire “verified purchaser”
      })
      .returning({
        id: productReviews.id,
        createdAt: productReviews.createdAt,
        approved: productReviews.approved,
        verified: productReviews.verified,
      });

    const createdAt =
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);

    return NextResponse.json(
      {
        ok: true,
        productId,
        review: {
          id: row.id,
          createdAt,
          approved: row.approved,
          verified: row.verified,
        },
        moderation: approvedFlag ? "approved" : "pending",
      },
      { status: approvedFlag ? 201 : 202 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
