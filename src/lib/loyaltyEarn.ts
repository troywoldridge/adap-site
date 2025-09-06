// src/lib/loyaltyEarn.ts
import { db } from "@/lib/db";
import * as schema from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { loyaltyTransactions, loyaltyWallets } from "@/db/schema/loyalty";
import { LOYALTY, computeLoyalty } from "./loyalty";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";

/** Accept either a real DB or a transaction */
type AnyDb = NodePgDatabase<typeof schema> | PgTransaction<any, any, any>;

/** Ensure a wallet exists for a customer; works with db or transaction */
async function ensureWallet(customerId: string, tx?: AnyDb) {
  const t = (tx ?? (db as AnyDb));
  const [existing] = await t
    .select()
    .from(loyaltyWallets)
    .where(eq(loyaltyWallets.customerId, customerId))
    .limit(1);
  if (existing) return existing;

  const [created] = await t
    .insert(loyaltyWallets)
    .values({ customerId })
    .returning();
  return created;
}

/**
 * Earn points for a completed order (idempotent per (customerId, orderId)).
 * Call this once the order is truly billable (Paid/Completed) per SinaLite docs.
 */
export async function earnPointsFromOrder(params: {
  customerId: string;
  orderId: string;
  currency: "USD" | "CAD";
  eligibleAmount: number; // merchandise subtotal you want to award on
  note?: string;
}) {
  const { customerId, orderId, currency, eligibleAmount, note } = params;
  const rate = LOYALTY.EARN_POINTS_PER_DOLLAR[currency] ?? 0;
  const points = Math.max(0, Math.floor(eligibleAmount * rate));
  if (points <= 0) {
    const wallet = await ensureWallet(customerId);
    return { changed: false, snapshot: computeLoyalty(wallet.pointsBalance) };
  }

  return await db.transaction(async (tx) => {
    const wallet = await ensureWallet(customerId, tx);

    // Try to insert the 'earn' txn; if unique index says it's already there, bail gracefully
    try {
      await tx.insert(loyaltyTransactions).values({
        customerId,
        walletId: wallet.id,
        type: "earn",
        points, // positive
        source: "order",
        orderId,
        note: note ?? null,
      } as any);
    } catch {
      // Already earned for this order
      const [fresh] = await tx
        .select()
        .from(loyaltyWallets)
        .where(eq(loyaltyWallets.id, wallet.id))
        .limit(1);
      return { changed: false, snapshot: computeLoyalty(fresh?.pointsBalance ?? 0) };
    }

    const [updated] = await tx
      .update(loyaltyWallets)
      .set({
        pointsBalance: wallet.pointsBalance + points,
        lifetimeEarned: wallet.lifetimeEarned + points,
      })
      .where(eq(loyaltyWallets.id, wallet.id))
      .returning();

    return { changed: true, snapshot: computeLoyalty(updated.pointsBalance) };
  });
}
