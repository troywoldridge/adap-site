import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productReviews } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";

const ADMIN_EMAILS = ["troy.woldridge.1@gmail.com"];

export async function PATCH(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  const email = sessionClaims?.email;
  if (!userId || !email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, name, rating, comment } = await req.json();
  if (!id || !name || !rating || !comment) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  await db.update(productReviews)
    .set({ name, rating, comment })
    .where(productReviews.id.eq(id));
  return NextResponse.json({ success: true });
}
