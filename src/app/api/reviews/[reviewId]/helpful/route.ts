// src/app/api/reviews/[reviewId]/helpful/route.ts
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { dbClient as db } from "@/lib/db";
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

export async function POST(
  req: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const reviewIdNum = Number(params.reviewId);
    if (!Number.isFinite(reviewIdNum) || reviewIdNum <= 0) {
      return NextResponse.json({ ok: false, error: "invalid_review_id" }, { status: 400 });
    }

    // Must exist and be approved
    const [rev] = await db
      .select({ id: productReviews.id })
      .from(productReviews)
      .where(and(eq(productReviews.id, reviewIdNum), eq(productReviews.approved, true)))
      .limit(1);

    if (!rev) {
      return NextResponse.json({ ok: false, error: "review_not_found" }, { status: 404 });
    }

    const { userId } = await auth();

    const body = await req.json().catch(() => ({}));
    const supplied = (body?.fingerprint ?? "").toString().slice(0, 64);
    const ip = getClientIp(req.headers);
    const ua = req.headers.get("user-agent") ?? "";

    const fp =
      supplied ||
      crypto.createHash("sha256").update(`${ip}::${ua}::review:${reviewIdNum}`).digest("hex").slice(0, 64);

    await db
      .insert(reviewHelpfulVotes)
      .values({
        reviewId: reviewIdNum,
        voterFingerprint: fp,
        userId: userId ?? null,
        ip,
        isHelpful: true,
      })
      .onConflictDoNothing({
        target: [reviewHelpfulVotes.reviewId, reviewHelpfulVotes.voterFingerprint],
      });

    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(reviewHelpfulVotes)
      .where(and(eq(reviewHelpfulVotes.reviewId, reviewIdNum), eq(reviewHelpfulVotes.isHelpful, true)));

    return NextResponse.json({ ok: true, reviewId: reviewIdNum, votes: c, fingerprint: fp });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
