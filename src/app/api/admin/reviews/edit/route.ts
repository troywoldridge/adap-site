// src/app/api/admin/reviews/edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productReviews } from "@/db/schema/productReviews"; // <-- adjust path if different

const ADMIN_EMAILS = new Set<string>(["troy.woldridge.1@gmail.com"]);

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await currentUser();
  const email =
    me?.primaryEmailAddress?.emailAddress ?? me?.emailAddresses?.[0]?.emailAddress ?? null;

  if (!email || !ADMIN_EMAILS.has(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ✅ id is a UUID string
  const id: string = String(body?.id ?? "").trim();
  const rating = Number(body?.rating);
  const comment = String(body?.comment ?? "").trim();
  // We *don’t* set `name` because your schema doesn’t have it.
  // If your schema uses `displayName` or `authorName`, map it here:
  // const displayName = body?.name ? String(body.name).trim() : undefined;

  const uuidLike = /^[0-9a-fA-F-]{36}$/;
  if (!uuidLike.test(id) || !comment || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Missing/invalid fields" }, { status: 400 });
  }

  // Build a safe set-object with known columns only
  const setObj: Record<string, unknown> = {
    rating,
    comment,
    // If you *do* have a display name column, uncomment one of these:
    // ...(displayName ? { displayName } : {}),
    // ...(displayName ? { authorName: displayName } : {}),
  };

  await db.update(productReviews).set(setObj).where(eq(productReviews.id, id));

  return NextResponse.json({ success: true });
}
