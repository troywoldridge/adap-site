// src/app/api/me/loyalty/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers, loyaltyTransactions, loyaltyWallets } from "@/db/schema/customer";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });

  const [cust] = await db.select().from(customers).where(eq(customers.clerkUserId, userId)).limit(1);
  if (!cust) return NextResponse.json({ ok: true, wallet: null, txns: [] });

  const [wallet] = await db.select().from(loyaltyWallets).where(eq(loyaltyWallets.customerId, cust.id)).limit(1);
  const txns = await db
    .select()
    .from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.walletId, wallet.id))
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(50);

  return NextResponse.json({ ok: true, wallet, txns });
}
