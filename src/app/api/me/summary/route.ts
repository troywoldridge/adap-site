// src/app/api/me/summary/route.ts
import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuth, currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";

import { dbClient as db } from "@/lib/db";
import { customers } from "@/db/schema/customer";     // <- customers table that includes `clerkUserId`
import { loyaltyWallets } from "@/db/schema/loyalty"; // <- loyalty schema
import { orders } from "@/db/schema/orders";          // <- orders schema (has `userId`)

export async function GET(req: NextRequest) {
  // getAuth is synchronous (do NOT await)
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  // Prefer Clerk's user object for reliable email/name
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    // fallback so we never pass `undefined` to a NOT NULL email column
    `${userId}@users.invalid`;

  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    null;

  // Upsert customer by clerkUserId (ensure email is a definite string)
  const [cust] = await db
    .insert(customers)
    .values({
      clerkUserId: userId,       // must exist on your customers schema
      email,                      // never undefined
      displayName: displayName ?? null,
    })
    .onConflictDoUpdate({
      target: customers.clerkUserId,
      set: {
        email,                    // keep as string
        displayName: displayName ?? null,
      },
    })
    .returning();

  // Ensure wallet for this customer
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

  // Recent orders — your orders table uses `userId` (not customerId) elsewhere
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
    .where(eq(orders.userId, userId))
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
