// src/app/api/me/profile/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema/customer";
import { eq } from "drizzle-orm";
import { enc } from "@/lib/pii";

export async function PUT(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });

  const body = await req.json();
  const { displayName, phone, marketingOptIn } = body as { displayName?: string; phone?: string; marketingOptIn?: boolean; };

  const result = await db
    .update(customers)
    .set({
      displayName,
      marketingOptIn: marketingOptIn ?? undefined,
      phoneEnc: phone ? enc(phone) : undefined,
    })
    .where(eq(customers.clerkUserId, userId))
    .returning({
      id: customers.id,
      displayName: customers.displayName,
      marketingOptIn: customers.marketingOptIn,
    });

  return NextResponse.json({ ok: true, profile: result[0] });
}
