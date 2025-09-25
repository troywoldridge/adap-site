// src/app/api/me/orders/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { and, desc, eq } from "drizzle-orm";
import { orders } from "@/db/schema/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth(); // ✅ fix: await
    const jar = await cookies();                   // ✅ fix: await
    const sid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value ?? null;

    // Claim guest orders to the signed-in user (idempotent)
    if (clerkUserId && sid) {
      await db.update(orders).set({ userId: clerkUserId as any }).where(eq(orders.userId, sid));
    }

    // Build filter
    const filter = clerkUserId
      ? eq(orders.userId, clerkUserId as any)
      : sid
      ? eq(orders.userId, sid)
      : // no identity: return empty list
        and(eq(orders.userId, "__none__" as any));

    const rows = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        cartId: orders.cartId,
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
        placedAt: orders.placedAt,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(filter)
      .orderBy(desc(orders.placedAt), desc(orders.createdAt));

    return NextResponse.json({ ok: true, orders: rows });
  } catch (e: any) {
    console.error("/api/me/orders GET failed:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
