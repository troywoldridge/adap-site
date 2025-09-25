// src/app/api/loyalty/wallet/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { loyaltyWallets, loyaltyTransactions } from "@/db/schema/loyalty"; // adjust if needed

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { userId } = await auth(); // ✅ fix: await
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    await db
      .insert(loyaltyWallets)
      .values({
        customerId: userId as any,
        pointsBalance: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
      })
      .onConflictDoNothing();

    const [wallet] =
      (await db
        .select({
          id: loyaltyWallets.id,
          customerId: loyaltyWallets.customerId,
          pointsBalance: loyaltyWallets.pointsBalance,
          lifetimeEarned: loyaltyWallets.lifetimeEarned,
          lifetimeRedeemed: loyaltyWallets.lifetimeRedeemed,
          createdAt: loyaltyWallets.createdAt,
          updatedAt: loyaltyWallets.updatedAt,
        })
        .from(loyaltyWallets)
        .where(eq(loyaltyWallets.customerId, userId as any))
        .limit(1)) ?? [];

    const points = Number(wallet?.pointsBalance ?? 0);
    const tier =
      points >= 5000 ? "Diamond" : points >= 2500 ? "Gold" : points >= 1000 ? "Silver" : "Bronze";

    const history =
      (await db
        .select()
        .from(loyaltyTransactions)
        .where(eq(loyaltyTransactions.customerId, userId as any))
        .orderBy(loyaltyTransactions.createdAt)
        .limit(50)) ?? [];

    return NextResponse.json({ ok: true, wallet: wallet ?? null, tier, history });
  } catch (e: any) {
    console.error("/api/loyalty/wallet GET failed:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
