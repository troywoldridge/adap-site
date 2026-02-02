// src/app/api/me/loyalty/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";

import { dbClient as db } from "@/lib/db";
import { loyaltyWallets, loyaltyTransactions } from "@/db/schema/loyalty";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function computeLoyalty(pointsBalance: number) {
  const pts = Math.max(0, Number(pointsBalance) || 0);
  // Simple tier ladder – tweak anytime
  let tier: "Bronze" | "Silver" | "Gold" | "Platinum" = "Bronze";
  let nextTierAt: number | null = 1000;
  if (pts >= 15000) { tier = "Platinum"; nextTierAt = null; }
  else if (pts >= 5000) { tier = "Gold"; nextTierAt = 15000; }
  else if (pts >= 1000) { tier = "Silver"; nextTierAt = 5000; }

  return {
    balance: pts,
    points: pts,
    tier,
    nextTierAt,
  };
}

export async function GET() {
  try {
    const { userId } = await auth(); // Next 15: await this
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [walletRow] =
      (await db
        .select()
        .from(loyaltyWallets)
        .where(eq(loyaltyWallets.customerId, userId))
        .limit(1)) ?? [];

    const snapshot = computeLoyalty(walletRow?.pointsBalance ?? 0);

    const txns = await db
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.customerId, userId))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(50);

    return NextResponse.json({ ok: true, wallet: snapshot, transactions: txns });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/me/loyalty failed:", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
