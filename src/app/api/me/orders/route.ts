import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, inArray, ne } from "drizzle-orm";

import { dbClient as db } from "@/lib/db";
import { orders } from "@/db/schema/orders";
import { cartLines } from "@/db/schema/cartLines";
import { carts } from "@/db/schema/cart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { userId } = await auth();
    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

    if (!userId && !sid) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Auto-claim guest orders to the signed-in user
    if (userId && sid) {
      await db.update(orders).set({ userId }).where(eq(orders.userId, sid));
    }

    // Pull orders for either the true user or the guest sid (if still guest)
    const keys = (userId ? [userId, sid] : [sid]).filter(Boolean) as string[];
    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        placedAt: orders.placedAt,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        provider: orders.provider,
        providerId: orders.providerId,
        currency: orders.currency,
        subtotalCents: orders.subtotalCents,
        shippingCents: orders.shippingCents,
        taxCents: orders.taxCents,
        discountCents: orders.discountCents,
        creditsCents: orders.creditsCents,
        totalCents: orders.totalCents,
        cartId: orders.cartId,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(inArray(orders.userId, keys))
      .orderBy(desc(orders.placedAt), desc(orders.createdAt));

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, orders: [] });
    }

    // Representative product per order (for a nice thumbnail)
    const cartIds = [...new Set(rows.map((r) => r.cartId).filter(Boolean) as string[])];

    let firstByCart = new Map<string, number>();
    if (cartIds.length) {
      const lines = await db
        .select({ cartId: cartLines.cartId, productId: cartLines.productId })
        .from(cartLines)
        .where(inArray(cartLines.cartId, cartIds));
      for (const l of lines) {
        if (!firstByCart.has(l.cartId)) firstByCart.set(l.cartId, Number(l.productId));
      }
    }

    const out = rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      placedAt: r.placedAt ?? r.createdAt,
      status: r.status,
      paymentStatus: r.paymentStatus,
      provider: r.provider,
      providerId: r.providerId,
      currency: r.currency,
      subtotalCents: Number(r.subtotalCents) || 0,
      shippingCents: Number(r.shippingCents) || 0,
      taxCents: Number(r.taxCents) || 0,
      discountCents: Number(r.discountCents) || 0,
      creditsCents: Number(r.creditsCents) || 0,
      totalCents: Number(r.totalCents) || 0,
      representativeProductId: r.cartId ? firstByCart.get(r.cartId) ?? null : null,
    }));

    return NextResponse.json({ ok: true, orders: out });
  } catch (e: any) {
    console.error("/api/me/orders failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
