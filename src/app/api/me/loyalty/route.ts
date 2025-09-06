import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loyaltyWallets, loyaltyTransactions } from "@/db/schema/loyalty";
import { eq, desc } from "drizzle-orm";
import { computeLoyalty, type LoyaltySnapshot } from "@/lib/loyalty";

export type LoyaltyAPI = { wallet: LoyaltySnapshot; transactions: any[] };

export async function GET() {
  const { userId } = await auth(); // ✅ await
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // inside GET handler after auth()
  let [wallet] = await db.select().from(loyaltyWallets).where(eq(loyaltyWallets.customerId, userId)).limit(1);
  if (!wallet) {
    [wallet] = await db.insert(loyaltyWallets).values({ customerId: userId } as any).onConflictDoNothing?.().returning();
    if (!wallet) {
      [wallet] = await db.select().from(loyaltyWallets).where(eq(loyaltyWallets.customerId, userId)).limit(1);
    }
  }

  const [walletRow] = await db.select().from(loyaltyWallets)
    .where(eq(loyaltyWallets.customerId, userId)).limit(1);

  const wallet = computeLoyalty(walletRow?.pointsBalance ?? 0);

  const txns = await db.select().from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.customerId, userId))
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(50);

  const body: LoyaltyAPI = { wallet, transactions: txns as any[] };
  return NextResponse.json(body);
}
