import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { loyaltyTransactions, loyaltyWallets } from "@/lib/db/schema/loyalty";
import { computeLoyalty } from "@/lib/loyalty";
import { requireAdmin } from "@/lib/authz";

export async function POST(req: Request) {
  const database = db;

  try {
    await requireAdmin();

    const raw = await req.json();
    const targetUserId = typeof raw.targetUserId === "string" ? raw.targetUserId : "";
    const points = Math.trunc(Number(raw.points ?? 0));
    const note = typeof raw.note === "string" ? raw.note : null;

    if (!targetUserId || !Number.isFinite(points) || points === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await database.transaction(async (tx) => {
      let [wallet] = await tx
        .select()
        .from(loyaltyWallets)
        .where(eq(loyaltyWallets.customerId, targetUserId))
        .limit(1);

      if (!wallet) {
        [wallet] = await tx
          .insert(loyaltyWallets)
          .values({ customerId: targetUserId })
          .returning();
      }

      const newBalance = wallet.pointsBalance + points;
      if (newBalance < 0) {
        return { status: 400, json: { error: "Insufficient balance" } };
      }

      await tx.update(loyaltyWallets).set({
        pointsBalance: newBalance,
        lifetimeEarned: wallet.lifetimeEarned + Math.max(points, 0),
        lifetimeRedeemed: wallet.lifetimeRedeemed + Math.max(-points, 0),
      }).where(eq(loyaltyWallets.id, wallet.id));

      await tx.insert(loyaltyTransactions).values({
        customerId: targetUserId,
        walletId: wallet.id,
        delta: points,
        reason: "adjustment",
        orderId: null,
        note,
      });

      return { status: 200, json: { ok: true, wallet: computeLoyalty(newBalance) } };
    });

    return NextResponse.json(result.json, { status: result.status });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
