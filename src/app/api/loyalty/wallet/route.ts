// src/app/api/loyalty/wallet/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { customers, loyaltyWallets } from "@/db/schema/customer";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  // find/create customer
  let cust = await db.query.customers.findFirst({ where: eq(customers.clerkUserId, userId) });
  if (!cust) {
    [cust] = await db.insert(customers).values({ clerkUserId: userId }).returning();
  }

  // find/create wallet
  let wallet = await db.query.loyaltyWallets.findFirst({ where: eq(loyaltyWallets.customerId, cust.id) });
  if (!wallet) {
    [wallet] = await db.insert(loyaltyWallets).values({ customerId: cust.id, pointsBalance: 0 }).returning();
  }

  return NextResponse.json({ ok: true, balance: wallet.pointsBalance });
}
