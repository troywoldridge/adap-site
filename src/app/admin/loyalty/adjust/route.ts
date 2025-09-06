import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loyaltyTransactions, loyaltyWallets } from "@/db/schema/loyalty";
import { eq } from "drizzle-orm";
import { computeLoyalty } from "@/lib/loyalty";
import { requireAdmin } from "@/lib/authz";

/** POST /api/admin/loyalty/adjust
 * Body: { targetUserId: string; points: number; note?: string }
 * - points can be positive or negative
 * - role-guarded (admin only)
 */
export async function POST(req: Request) {
  try {
    await requireAdmin(); // throws 401/403 on fail

    const body = await req.json().catch(() => ({}));
    const targetUserId = String(body.targetUserId ?? "");
    const points = Math.trunc(Number(body.points ?? 0));
    const note = typeof body.note === "string" ? body.note : null;

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
    }
    if (!Number.isFinite(points) || points === 0) {
      return NextResponse.json({ error: "Provide a non-zero integer 'points'" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // Ensure wallet exists
      let [wallet] = await tx.select().from(loyaltyWallets).where(eq(loyaltyWallets.customerId, targetUserId)).limit(1);
      if (!wallet) {
        [wallet] = await tx.insert(loyaltyWallets).values({ customerId: targetUserId } as any).returning();
      }

      const newBalance = wallet.pointsBalance + points;
      if (newBalance < 0) {
        return { ok: false as const, status: 400, json: { error: "Insufficient balance for negative adjust" } };
      }

      await tx.update(loyaltyWallets)
        .set({
          pointsBalance: newBalance,
          lifetimeEarned: wallet.lifetimeEarned + Math.max(points, 0),
          lifetimeRedeemed: wallet.lifetimeRedeemed + Math.max(-points, 0),
        })
        .where(eq(loyaltyWallets.id, wallet.id));

      await tx.insert(loyaltyTransactions).values({
        customerId: targetUserId,
        walletId: wallet.id,
        type: "adjust",
        points,      // +/- integer
        source: "admin",
        orderId: null,
        note,
      } as any);

      return { ok: true as const, status: 200, json: { ok: true, wallet: computeLoyalty(newBalance) } };
    });

    return NextResponse.json(result.json as any, { status: result.status });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status });
  }
}
