import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { loyaltyTransactions, loyaltyWallets } from "@/db/schema/loyalty";
import { computeLoyalty } from "@/lib/loyalty";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const points = Math.floor(Number(body.points ?? 0)); // can be + or -
  const note = typeof body.note === "string" ? body.note : null;

  if (!Number.isFinite(points) || points === 0) {
    return NextResponse.json({ error: "Provide a non-zero integer points value" }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(loyaltyWallets)
      .where(eq(loyaltyWallets.customerId, userId))
      .limit(1);

    if (!wallet) return { ok: false as const, status: 404, json: { error: "Wallet not found" } };

    const newBalance = wallet.pointsBalance + points;
    if (newBalance < 0) return { ok: false as const, status: 400, json: { error: "Insufficient balance for negative adjust" } };

    await tx.update(loyaltyWallets)
      .set({
        pointsBalance: newBalance,
        lifetimeEarned: wallet.lifetimeEarned + Math.max(points, 0),
        lifetimeRedeemed: wallet.lifetimeRedeemed + Math.max(-points, 0),
      })
      .where(eq(loyaltyWallets.id, wallet.id));

    await tx.insert(loyaltyTransactions).values({
      customerId: userId,
      walletId: wallet.id,
      type: "adjust",
      points, // + or -
      source: "admin",
      orderId: null,
      note,
    } as any);

    return { ok: true as const, status: 200, json: { ok: true, wallet: computeLoyalty(newBalance) } };
  });

  return NextResponse.json(result.json as any, { status: result.status });
}
