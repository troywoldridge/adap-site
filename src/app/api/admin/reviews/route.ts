// app/api/admin/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productReviews } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

const ADMIN_EMAILS = ["troy.woldridge.1@gmail.com"];

// GET: list pending reviews
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const emails = user?.emailAddresses?.map((e) => e.emailAddress) ?? [];
  if (!emails.some((e) => ADMIN_EMAILS.includes(e))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const rating = searchParams.get("rating");

  const conditions = [eq(productReviews.approved, false)];
  if (productId) {
    conditions.push(eq(productReviews.productId, productId));
  }
  if (rating) {
    conditions.push(eq(productReviews.rating, Number(rating)));
  }

  const reviews = await db
    .select()
    .from(productReviews)
    .where(and(...conditions))
    .orderBy(desc(productReviews.createdAt));

  return NextResponse.json(reviews);
}

// POST: bulk approve/delete reviews
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const emails = user?.emailAddresses?.map((e) => e.emailAddress) ?? [];
  if (!emails.some((e) => ADMIN_EMAILS.includes(e))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids, action } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }
  if (action !== "approve" && action !== "delete") {
    return NextResponse.json({ error: "action must be 'approve' or 'delete'" }, { status: 400 });
  }

  const idNums = ids.map((n: unknown) => Number(n)).filter((n) => Number.isFinite(n));

  if (action === "approve") {
    await db
      .update(productReviews)
      .set({ approved: true })
      .where(inArray(productReviews.id, idNums));
  } else {
    await db.delete(productReviews).where(inArray(productReviews.id, idNums));
  }

  return NextResponse.json({ success: true });
}
