// src/app/account/orders/[id]/reorder/edit/page.tsx
import "server-only";

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema/orders";
import { cartLines } from "@/lib/db/schema/cartLines";

import ReorderEditor from "./ReorderEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderRow = typeof orders.$inferSelect;

async function load(orderId: string) {
  const { userId } = await auth();

  const jar = await cookies();
  const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

  const { select, update } = db;

  const o =
    ((await select().from(orders).where(eq(orders.id, orderId)).limit(1))?.[0] as OrderRow | undefined) ??
    null;

  if (!o) return null;

  // Guest → user claim
  if (userId && String((o as any).userId) === String(sid)) {
    await update(orders).set({ userId }).where(eq(orders.id, orderId));
    (o as any).userId = userId;
  }

  // Ownership check
  const claimants = [userId, sid].filter(Boolean) as string[];
  if (!claimants.includes(String((o as any).userId))) return null;

  const cartId = ((o as any).cartId as string | null) ?? null;

  const lines = cartId
    ? await select({
        id: cartLines.id,
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
        optionIds: cartLines.optionIds,
      })
        .from(cartLines)
        .where(eq(cartLines.cartId, cartId))
    : [];

  // ✅ TS2869 fix: return a guaranteed union
  const currency: "USD" | "CAD" = (o as any).currency === "CAD" ? "CAD" : "USD";

  return { orderId, currency, lines };
}

export default async function Page({ params }: { params: { id: string } }) {
  const data = await load(params.id);
  if (!data) notFound();
  return <ReorderEditor {...data} />;
}
