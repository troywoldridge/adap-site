// src/app/api/me/summary/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

import { db } from "@/lib/db";
import { customers, loyaltyWallets, orders } from "@/db/schema/customer";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  // Clerk auth derived from NextRequest (typed correctly)
  const { userId, sessionClaims } = await getAuth(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  const email = (sessionClaims?.email as string) || null;
  const displayName = (sessionClaims?.name as string) || null;

  // Upsert customer + ensure wallet
  const [cust] = await db
    .insert(customers)
    .values({
      clerkUserId: userId,
      email: email ?? undefined,
      displayName: displayName ?? undefined,
    })
    .onConflictDoUpdate({
      target: customers.clerkUserId,
      set: { email: email ?? undefined, displayName: displayName ?? undefined },
    })
    .returning();

  const [wallet] = await db
    .select()
    .from(loyaltyWallets)
    .where(eq(loyaltyWallets.customerId, cust.id))
    .limit(1);

  const recentOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalCents: orders.totalCents,
      currency: orders.currency,
      placedAt: orders.placedAt,
    })
    .from(orders)
    .where(eq(orders.customerId, cust.id))
    .orderBy(desc(orders.placedAt))
    .limit(5);

  return NextResponse.json({
    ok: true,
    profile: {
      displayName: cust.displayName,
      email: cust.email,
      marketingOptIn: cust.marketingOptIn,
    },
    points: wallet?.pointsBalance ?? 0,
    recentOrders,
  });
}
