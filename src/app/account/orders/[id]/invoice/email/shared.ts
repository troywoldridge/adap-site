// src/app/account/orders/[id]/invoice/email/shared.ts
import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db as getDb } from "@/lib/db";
import { orders } from "@/db/schema/orders";
import { cartLines } from "@/db/schema/cartLines";

type OrderRow = typeof orders.$inferSelect;

export type InvoiceEmailLine = {
  id: string;
  productId: number | string;
  quantity: number | string;
  unitPriceCents: number | string | null;
  lineTotalCents: number | string | null;
  optionIds?: (number | string)[] | null;
};

export async function loadOrderForInvoiceEmail(orderId: string): Promise<{
  order: OrderRow;
  lines: InvoiceEmailLine[];
  currency: "USD" | "CAD";
} | null> {
  const { userId } = await auth();

  // In your project typings, cookies() is Promise-like — await it.
  const jar = await cookies();
  const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

  const db = getDb();
  const { select, update } = db;

  const order =
    ((await select().from(orders).where(eq(orders.id, orderId)).limit(1))?.[0] as OrderRow | undefined) ??
    null;

  if (!order) return null;

  // Guest → user claim
  if (userId && String((order as any).userId) === String(sid)) {
    await update(orders).set({ userId }).where(eq(orders.id, orderId));
    (order as any).userId = userId;
  }

  // Ownership check after potential claim
  const claimants = [userId, sid].filter(Boolean) as string[];
  if (!claimants.includes(String((order as any).userId))) return null;

  const cartId = ((order as any).cartId as string | null) ?? null;

  const lines: InvoiceEmailLine[] = cartId
    ? ((await select({
        id: cartLines.id,
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
        optionIds: cartLines.optionIds,
      })
        .from(cartLines)
        .where(eq(cartLines.cartId, cartId))) as unknown as InvoiceEmailLine[])
    : [];

  // ✅ TS2869 fix: no nullish coalescing needed here
  const currency: "USD" | "CAD" = (order as any).currency === "CAD" ? "CAD" : "USD";

  return { order, lines, currency };
}
