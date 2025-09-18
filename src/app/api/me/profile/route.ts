// src/app/api/me/profile/route.ts
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers } from "@/db/schema/customer";
import { enc } from "@/lib/pii";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    displayName?: string;
    phone?: string;
    marketingOptIn?: boolean;
  };

  // Build an update object that matches the table’s insert type
  const update: Partial<typeof customers.$inferInsert> & Record<string, unknown> = {};

  if (typeof body.displayName === "string" && body.displayName.trim()) {
    update.displayName = body.displayName.trim();
  }
  if (typeof body.marketingOptIn === "boolean") {
    update.marketingOptIn = body.marketingOptIn;
  }
  if (typeof body.phone === "string") {
    const phone = body.phone.trim();
    if (phone) {
      // enc() returns a Drizzle SQL chunk (or Buffer) — allow it
      update.phoneEnc = enc(phone) as any;
    } else {
      // Optional: clear the phone if client sends empty string
      // If your column is nullable, set to null; otherwise omit.
      update.phoneEnc = null as any;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
  }

  const [result] = await db
    .update(customers)
    .set(update as any)
    .where(eq(customers.clerkUserId, userId))
    .returning({
      id: customers.id,
      displayName: customers.displayName,
      marketingOptIn: customers.marketingOptIn,
    });

  return NextResponse.json({ ok: true, profile: result });
}
