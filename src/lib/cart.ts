// src/lib/cart.ts
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getOpenCartBySid(sid: string) {
  return db.query.carts.findFirst({ where: and(eq(carts.sid, sid), eq(carts.status, "open")) });
}

export async function createOpenCart(sid: string, userId?: string | null) {
  const [row] = await db
    .insert(carts)
    .values({ sid, userId: userId ?? null })
    .returning();
  return row;
}

export async function getOrCreateOpenCartBySid(sid: string, userId?: string | null) {
  const existing = await getOpenCartBySid(sid);
  if (existing) return existing;
  return createOpenCart(sid, userId);
}

export async function addOrMergeLine(args: {
  cartId: string;
  productId: number;
  optionIds: number[] | null;
  quantity: number;
}) {
  const existing = await db.query.cartLines.findFirst({
    where: and(eq(cartLines.cartId, args.cartId), eq(cartLines.productId, args.productId)),
  });

  if (existing && JSON.stringify(existing.optionIds || []) === JSON.stringify(args.optionIds || [])) {
    const [updated] = await db
      .update(cartLines)
      .set({ quantity: existing.quantity + args.quantity, updatedAt: new Date().toISOString() })
      .where(eq(cartLines.id, existing.id))
      .returning();
    return { line: updated, merged: true };
  }

  const [inserted] = await db
    .insert(cartLines)
    .values({
      cartId: args.cartId,
      productId: args.productId,
      optionIds: args.optionIds,
      quantity: Math.max(1, args.quantity),
    })
    .returning();
  return { line: inserted, merged: false };
}

export async function getCurrentCartFull(cartId: string) {
  const lines = await db.query.cartLines.findMany({ where: eq(cartLines.cartId, cartId) });
  return { lines };
}
