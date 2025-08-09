import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewHelpfulVotes } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest, { params }: { params: { reviewId: string } }) {
  const { reviewId } = params;
  const { isHelpful } = await req.json();

  if (typeof isHelpful !== "boolean") {
    return NextResponse.json({ error: "Missing vote" }, { status: 400 });
  }

  let userId = null;
  try {
    const { userId: clerkUser } = auth();
    userId = clerkUser || null;
  } catch {}

  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "";

  // Only one vote per user per review (or per IP if not logged in)
  const alreadyVoted = await db
    .select()
    .from(reviewHelpfulVotes)
    .where(reviewHelpfulVotes.reviewId.eq(Number(reviewId)))
    .where(userId
      ? reviewHelpfulVotes.userId.eq(userId)
      : reviewHelpfulVotes.ip.eq(ip))
    .limit(1);

  if (alreadyVoted.length) {
    return NextResponse.json({ error: "Already voted" }, { status: 409 });
  }

  await db.insert(reviewHelpfulVotes).values({
    reviewId: Number(reviewId),
    userId,
    ip,
    isHelpful,
  });

  return NextResponse.json({ success: true });
}
