import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productReviews } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";

const ADMIN_EMAILS = ["troy.woldridge.1@gmail.com"];

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  const email = sessionClaims?.email;
  if (!userId || !email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const rating = searchParams.get("rating");

  let query = db.select().from(productReviews).where(productReviews.approved.eq(false));
  if (productId) {
    query = query.where(productReviews.productId.eq(productId));
  }
  if (rating) {
    query = query.where(productReviews.rating.eq(Number(rating)));
  }

  const reviews = await query.orderBy(productReviews.createdAt.desc());
  return NextResponse.json(reviews);
}

// Bulk PATCH for approve/delete
export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  const email = sessionClaims?.email;
  if (!userId || !email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { ids, action } = await req.json();
  if (!Array.isArray(ids) || !["approve", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (action === "approve") {
    await db.update(productReviews).set({ approved: true }).where(productReviews.id.in(ids));
    return NextResponse.json({ success: true });
  }
  if (action === "delete") {
    await db.delete(productReviews).where(productReviews.id.in(ids));
    return NextResponse.json({ success: true });
  }
}
