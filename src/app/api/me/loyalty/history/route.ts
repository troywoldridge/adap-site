// src/app/api/me/loyalty/history/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { loyaltyTransactions, loyaltyWallets } from "@/lib/db/schema/loyalty";
import { desc, eq } from "drizzle-orm";

type UiTxn = {
  id: string;
  type: "earn" | "redeem" | "adjustment";
  pointsDelta: number;
  reason: "purchase" | "refund" | "adjustment" | "signup" | "promotion";
  note: string | null;
  orderId: string | null;
  createdAt: string;
  balanceAfter: number;
};

export async function GET() {
  // ✅ await auth() so TS knows we're not holding a Promise
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Current wallet (for balance)
  const wallet = await db.query.loyaltyWallets.findFirst({
    where: eq(loyaltyWallets.customerId, userId),
  });
  const currentBalance = wallet?.pointsBalance ?? 0;

  // Recent transactions (newest first)
  const txns = await db
    .select({
      id: loyaltyTransactions.id,
      delta: loyaltyTransactions.delta,
      reason: loyaltyTransactions.reason,
      note: loyaltyTransactions.note,
      orderId: loyaltyTransactions.orderId,
      createdAt: loyaltyTransactions.createdAt,
    })
    .from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.customerId, userId))
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(200);

  // Compute balanceAfter per row in descending order
  let running = currentBalance;
  const items: UiTxn[] = txns.map((row) => {
    const type: UiTxn["type"] =
      row.delta > 0 ? "earn" : row.delta < 0 ? "redeem" : "adjustment";

    const item: UiTxn = {
      id: row.id,
      type,
      pointsDelta: row.delta,
      reason: row.reason as UiTxn["reason"],
      note: row.note ?? null,
      orderId: row.orderId ?? null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      balanceAfter: running,
    };

    running -= row.delta;
    return item;
  });

  return NextResponse.json({ ok: true, balance: currentBalance, items });
}
