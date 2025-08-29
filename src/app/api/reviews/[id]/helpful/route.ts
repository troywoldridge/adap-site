// src/app/api/reviews/[id]/helpful/route.ts
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { reviewHelpfulVotes } from "@/db/schema/reviewHelpfulVotes";
import { productReviews } from "@/db/schema/productReviews";
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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = Number(params.id);
    if (!Number.isFinite(reviewId) || reviewId <= 0) {
      return NextResponse.json({ ok: false, error: "invalid_review_id" }, { status: 400 });
    }

    // Review must exist + be approved
    const [rev] = await db
      .select({ id: productReviews.id })
      .from(productReviews)
      .where(and(eq(productReviews.id, reviewId), eq(productReviews.approved, true)))
      .limit(1);

    if (!rev) {
      return NextResponse.json({ ok: false, error: "review_not_found" }, { status: 404 });
    }

    // Build/accept a voter fingerprint
    const body = await req.json().catch(() => ({}));
    const supplied = (body?.fingerprint || "").toString().slice(0, 64);
    const ip = getClientIp(req.headers);
    const ua = req.headers.get("user-agent") ?? "";

    const fp =
      supplied ||
      crypto.createHash("sha256").update(`${ip}::${ua}::review:${reviewId}`).digest("hex").slice(0, 64);

    // Upsert (unique on (review_id, voter_fingerprint))
    await db
      .insert(reviewHelpfulVotes)
      .values({ reviewId, voterFingerprint: fp })
      .onConflictDoNothing({
        target: [reviewHelpfulVotes.reviewId, reviewHelpfulVotes.voterFingerprint],
      });

    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(reviewHelpfulVotes)
      .where(eq(reviewHelpfulVotes.reviewId, reviewId));

    return NextResponse.json({ ok: true, reviewId, votes: c, fingerprint: fp });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
