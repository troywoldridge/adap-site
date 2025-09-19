// src/app/admin/loyalty/adjust/route.ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { loyaltyTransactions, loyaltyWallets } from "@/db/schema/loyalty";
import { computeLoyalty } from "@/lib/loyalty";
import { requireAdmin } from "@/lib/authz";

type WalletRow = typeof loyaltyWallets.$inferSelect;
type WalletInsert = typeof loyaltyWallets.$inferInsert;
type TxInsert = typeof loyaltyTransactions.$inferInsert;
type LoyaltySnapshot = ReturnType<typeof computeLoyalty>;

type AdjustBody = {
  targetUserId?: unknown;
  points?: unknown;
  note?: unknown;
};

type OkResult = { ok: true; status: 200; json: { ok: true; wallet: LoyaltySnapshot } };
type ErrResult = { ok: false; status: number; json: { error: string } };
type TxResult = OkResult | ErrResult;

/** POST /api/admin/loyalty/adjust
 * Body: { targetUserId: string; points: number; note?: string }
 * - points can be positive or negative
 * - role-guarded (admin only)
 */
export async function POST(req: Request) {
  try {
    await requireAdmin(); // throws 401/403 on fail

    const raw: AdjustBody = await req.json().catch(() => ({} as AdjustBody));
    const targetUserId = typeof raw.targetUserId === "string" ? raw.targetUserId : "";
    const points = Math.trunc(Number(raw.points ?? 0));
    const note = typeof raw.note === "string" ? raw.note : null;

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
    }
    if (!Number.isFinite(points) || points === 0) {
      return NextResponse.json({ error: "Provide a non-zero integer 'points'" }, { status: 400 });
    }

    const result: TxResult = await db.transaction(async (tx) => {
      // Ensure wallet exists (create if needed)
      let [wallet] = (await tx
        .select()
        .from(loyaltyWallets)
        .where(eq(loyaltyWallets.customerId, targetUserId))
        .limit(1)) as WalletRow[];

      if (!wallet) {
        const insertWallet: WalletInsert = { customerId: targetUserId };
        [wallet] = (await tx.insert(loyaltyWallets).values(insertWallet).returning()) as WalletRow[];
      }

      const newBalance = wallet.pointsBalance + points;
      if (newBalance < 0) {
        return { ok: false, status: 400, json: { error: "Insufficient balance for negative adjust" } };
      }

      await tx
        .update(loyaltyWallets)
        .set({
          pointsBalance: newBalance,
          lifetimeEarned: wallet.lifetimeEarned + Math.max(points, 0),
          lifetimeRedeemed: wallet.lifetimeRedeemed + Math.max(-points, 0),
        })
        .where(eq(loyaltyWallets.id, wallet.id));

      // ✅ match your schema: delta + reason ("adjustment"), optional orderId nullable, note
      const txRow: TxInsert = {
        customerId: targetUserId,
        walletId: wallet.id,
        delta: points,
        reason: "adjustment",
        orderId: null,
        note,
      };
      await tx.insert(loyaltyTransactions).values(txRow);

      return { ok: true, status: 200, json: { ok: true, wallet: computeLoyalty(newBalance) } };
    });

    return NextResponse.json(result.json, { status: result.status });
  } catch (e: unknown) {
    const status = getStatus(e) ?? 500;
    const message = getMessage(e) ?? "Server error";
    return NextResponse.json({ error: message }, { status });
  }
}

/* -------------------- helpers -------------------- */

function getStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err && "status" in err) {
    const v = (err as { status?: unknown }).status;
    if (typeof v === "number") return v;
  }
  return undefined;
}

function getMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return undefined;
}
