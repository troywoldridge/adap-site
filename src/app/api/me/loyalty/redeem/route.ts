import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { dbClient as db } from "@/lib/db";
import { and, eq, gte } from "drizzle-orm";
import { loyaltyTransactions, loyaltyWallets } from "@/db/schema/loyalty";
import { LOYALTY, computeLoyalty, pointsToCreditDollars } from "@/lib/loyalty";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rawPoints = Number(body.points ?? 0);
  const note = typeof body.note === "string" ? body.note : null;

  const min = LOYALTY.REDEEM_MIN_POINTS;
  const step = LOYALTY.REDEEM_INCREMENT;
  const isValidStep = step > 0 && rawPoints % step === 0;

  if (!Number.isFinite(rawPoints) || rawPoints <= 0 || rawPoints < min || !isValidStep) {
    return NextResponse.json(
      { error: `Invalid points. Min ${min}, multiples of ${step}.` },
      { status: 400 },
    );
  }

  const result = await db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(loyaltyWallets)
      .where(eq(loyaltyWallets.customerId, userId))
      .limit(1);

    if (!wallet) return { ok: false as const, status: 404, json: { error: "Wallet not found" } };

    const newBalance = wallet.pointsBalance - rawPoints;
    if (newBalance < 0) return { ok: false as const, status: 400, json: { error: "Insufficient points" } };

    const updatedRows = await tx.update(loyaltyWallets)
      .set({ pointsBalance: newBalance, lifetimeRedeemed: wallet.lifetimeRedeemed + rawPoints })
      .where(and(eq(loyaltyWallets.id, wallet.id), gte(loyaltyWallets.pointsBalance, rawPoints)))
      .returning();
    if (updatedRows.length === 0) {
      return { ok: false as const, status: 409, json: { error: "Balance changed, try again" } };
    }

    await tx.insert(loyaltyTransactions).values({
      customerId: userId,
      walletId: wallet.id,
      type: "redeem",
      points: -rawPoints,
      source: "manual",
      orderId: null,
      note,
    } as any);

    const credit = pointsToCreditDollars(rawPoints);
    const snapshot = computeLoyalty(newBalance);

    return { ok: true as const, status: 200, json: { ok: true, credit, wallet: snapshot } };
  });

  return NextResponse.json(result.json as any, { status: result.status });
}
