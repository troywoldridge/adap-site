// src/app/api/me/loyalty/wallet/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dbClient as db } from "@/lib/db";
import { loyaltyWallets, loyaltyTransactions } from "@/db/schema/loyalty";
import { eq, sql } from "drizzle-orm";

type Reason = "purchase" | "refund" | "adjustment" | "signup" | "promotion";
const allowedReasons: Set<Reason> = new Set([
  "purchase",
  "refund",
  "adjustment",
  "signup",
  "promotion",
]);

type WalletRow = {
  id: string;
  customerId: string;
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};
type WalletOut = Omit<WalletRow, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type UiTxn = {
  id: string;
  type: "earn" | "redeem" | "adjustment";
  pointsDelta: number;
  reason: Reason;
  note: string | null;
  orderId: string | null;
  createdAt: string;
  balanceAfter: number;
};

function toIso(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v ?? "");
}

function walletProjection() {
  return {
    id: loyaltyWallets.id,
    customerId: loyaltyWallets.customerId,
    pointsBalance: loyaltyWallets.pointsBalance,
    lifetimeEarned: loyaltyWallets.lifetimeEarned,
    lifetimeRedeemed: loyaltyWallets.lifetimeRedeemed,
    createdAt: loyaltyWallets.createdAt,
    updatedAt: loyaltyWallets.updatedAt,
  };
}

/** GET /api/me/loyalty/wallet
 *  - Auth
 *  - Ensure wallet exists (create if missing)
 *  - Return normalized wallet
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Explicit projection so TS always sees full shape
  let [row] =
    (await db
      .select(walletProjection())
      .from(loyaltyWallets)
      .where(eq(loyaltyWallets.customerId, userId))
      .limit(1)) as WalletRow[];

  let created = false;

  if (!row) {
    const [inserted] = (await db
      .insert(loyaltyWallets)
      .values({
        customerId: userId,
        pointsBalance: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
      })
      .returning(walletProjection())) as WalletRow[];
    row = inserted!;
    created = true;
  }

  const wallet: WalletOut = {
    id: row.id,
    customerId: row.customerId,
    pointsBalance: row.pointsBalance,
    lifetimeEarned: row.lifetimeEarned,
    lifetimeRedeemed: row.lifetimeRedeemed,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };

  return NextResponse.json({ ok: true, created, wallet });
}

/** POST /api/me/loyalty/wallet
 * Body: { delta: number (int, ≠0), reason: Reason, note?: string, orderId?: string }
 * Effect:
 *  - Upserts wallet
 *  - Applies delta (no negative balances)
 *  - Updates lifetimeEarned/Redeemed
 *  - Inserts loyalty_transactions row
 *  - Returns updated wallet + created transaction (UI-friendly)
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { delta, reason, note, orderId } = (body ?? {}) as {
    delta?: unknown;
    reason?: unknown;
    note?: unknown;
    orderId?: unknown;
  };

  if (typeof delta !== "number" || !Number.isInteger(delta) || delta === 0) {
    return NextResponse.json(
      { ok: false, error: "delta must be a non-zero integer" },
      { status: 400 }
    );
  }
  if (typeof reason !== "string" || !allowedReasons.has(reason as Reason)) {
    return NextResponse.json(
      { ok: false, error: "reason must be one of: purchase, refund, adjustment, signup, promotion" },
      { status: 400 }
    );
  }
  if (note != null && typeof note !== "string") {
    return NextResponse.json({ ok: false, error: "note must be a string" }, { status: 400 });
  }
  if (orderId != null && typeof orderId !== "string") {
    return NextResponse.json({ ok: false, error: "orderId must be a string" }, { status: 400 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1) Load wallet with full projection or create it
      let [w] =
        (await tx
          .select(walletProjection())
          .from(loyaltyWallets)
          .where(eq(loyaltyWallets.customerId, userId))
          .limit(1)) as WalletRow[];

      if (!w) {
        const [inserted] = (await tx
          .insert(loyaltyWallets)
          .values({
            customerId: userId,
            pointsBalance: 0,
            lifetimeEarned: 0,
            lifetimeRedeemed: 0,
          })
          .returning(walletProjection())) as WalletRow[];
        w = inserted!;
      }

      // 2) Compute new balance + lifetime counters
      const d = delta as number;
      const newPoints = w.pointsBalance + d;
      if (newPoints < 0) throw new Error("INSUFFICIENT_POINTS");

      const earnedInc = d > 0 ? d : 0;
      const redeemedInc = d < 0 ? -d : 0;

      // 3) Update wallet (explicit returning shape)
      const [updated] = (await tx
        .update(loyaltyWallets)
        .set({
          pointsBalance: newPoints,
          lifetimeEarned: w.lifetimeEarned + earnedInc,
          lifetimeRedeemed: w.lifetimeRedeemed + redeemedInc,
          updatedAt: sql`NOW()`,
        })
        .where(eq(loyaltyWallets.id, w.id))
        .returning(walletProjection())) as WalletRow[];

      // 4) Insert transaction (explicit returning)
      const [txn] = await tx
        .insert(loyaltyTransactions)
        .values({
          walletId: w.id,
          customerId: userId,
          orderId: (orderId as string | undefined) ?? null,
          delta: d,
          reason: reason as Reason,
          note: (note as string | undefined) ?? null,
        })
        .returning({
          id: loyaltyTransactions.id,
          delta: loyaltyTransactions.delta,
          reason: loyaltyTransactions.reason,
          note: loyaltyTransactions.note,
          orderId: loyaltyTransactions.orderId,
          createdAt: loyaltyTransactions.createdAt,
        });

      const type: UiTxn["type"] = d > 0 ? "earn" : d < 0 ? "redeem" : "adjustment";

      const walletOut: WalletOut = {
        id: updated.id,
        customerId: updated.customerId,
        pointsBalance: updated.pointsBalance,
        lifetimeEarned: updated.lifetimeEarned,
        lifetimeRedeemed: updated.lifetimeRedeemed,
        createdAt: toIso(updated.createdAt),
        updatedAt: toIso(updated.updatedAt),
      };

      const uiTxn: UiTxn = {
        id: txn.id,
        type,
        pointsDelta: txn.delta,
        reason: txn.reason as Reason,
        note: txn.note ?? null,
        orderId: txn.orderId ?? null,
        createdAt: toIso(txn.createdAt),
        balanceAfter: updated.pointsBalance,
      };

      return { wallet: walletOut, transaction: uiTxn };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    if (err?.message === "INSUFFICIENT_POINTS") {
      return NextResponse.json(
        { ok: false, error: "Insufficient points for this debit." },
        { status: 400 }
      );
    }
    console.error("loyalty.wallet POST error:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
