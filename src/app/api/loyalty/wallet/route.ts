// src/app/api/loyalty/wallet/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers } from "@/db/schema/customer";
// If your loyaltyWallets live in a different file, change this import accordingly:
import { loyaltyWallets } from "@/db/schema/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest) {
  // ✅ must await
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Clerk email (needed because customers.email is required in your schema)
  const user = await currentUser().catch(() => null);
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    null;

  // Find or create the customer row by Clerk user id
  let cust =
    (await db.query.customers.findFirst({
      where: eq(customers.clerkUserId, userId),
    })) || null;

  if (!cust) {
    if (!email) {
      // If email is required by your schema, fail loudly when we don’t have one
      return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
    }
    [cust] = await db
      .insert(customers)
      .values({ clerkUserId: userId, email })
      .returning();
  } else if (!cust.email && email) {
    // Backfill email if it was missing
    await db.update(customers).set({ email }).where(eq(customers.id, cust.id));
    cust.email = email;
  }

  // Find or create the loyalty wallet for this customer
  let wallet =
    (await db.query.loyaltyWallets.findFirst({
      where: eq(loyaltyWallets.customerId, cust.id),
    })) || null;

  if (!wallet) {
    [wallet] = await db
      .insert(loyaltyWallets)
      .values({ customerId: cust.id, pointsBalance: 0 })
      .returning();
  }

  return NextResponse.json({ ok: true, balance: wallet.pointsBalance ?? 0 });
}
