// src/app/api/create-payment-intent/route.ts
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { getCartCreditsCents } from "@/lib/cartCredits";
import { finalizeFreeOrderBySid } from "@/lib/checkout";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(_req: NextRequest) {
  try {
    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;
    if (!sid) {
      return NextResponse.json({ ok: false, error: "missing_sid" }, { status: 400 });
    }

    const [cart] =
      (await db
        .select({
          id: carts.id,
          status: carts.status,
          currency: carts.currency,
          selectedShipping: carts.selectedShipping,
        })
        .from(carts)
        .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
        .limit(1)) ?? [];

    if (!cart) {
      return NextResponse.json({ ok: false, error: "cart_not_found" }, { status: 404 });
    }

    const rows = await db
      .select({
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    const subtotalCents = rows.reduce((sum, r) => {
      const qty = Number(r.quantity ?? 0);
      const unit = Number(r.unitPriceCents ?? 0);
      const line = Number.isFinite(Number(r.lineTotalCents)) ? Number(r.lineTotalCents) : qty * unit;
      return sum + (Number.isFinite(line) ? line : 0);
    }, 0);

    const shipCents = Math.round(Number(cart?.selectedShipping?.cost ?? 0) * 100) || 0;
    const taxCents = 0;
    const creditsCents = await getCartCreditsCents(cart.id);
    const totalCents = Math.max(0, subtotalCents + shipCents + taxCents - creditsCents);
    const currency = (cart.currency === "CAD" ? "cad" : "usd") as "usd" | "cad";

    // ✅ FREE CHECKOUT PATH
    if (totalCents <= 0) {
      // optional: associate Clerk userId with the cart before finalizing (if your schema has carts.userId)
      const { userId } = await auth();
      if (userId) {
        try {
          // Best-effort; safe to ignore if your carts table doesn't have userId
          await db.update(carts as any).set({ userId }).where(eq(carts.id, cart.id));
        } catch {
          // ignore if column doesn't exist
        }
      }

      const result = await finalizeFreeOrderBySid(sid); // <- pass just the SID (string)
      if (!result) {
        return NextResponse.json({ ok: false, error: "finalize_failed" }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        free: true,
        orderId: result.orderId,
        amountCents: 0,
        currency,
      });
    }

    // 🔔 Stripe PaymentIntent path
    const intent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        sid,
        cartId: String(cart.id),
        subtotalCents: String(subtotalCents),
        shipCents: String(shipCents),
        taxCents: String(taxCents),
        creditsCents: String(creditsCents),
      },
    });

    return NextResponse.json({
      ok: true,
      clientSecret: intent.client_secret,
      amountCents: totalCents,
      currency,
    });
  } catch (e: unknown) {
    console.error("create-payment-intent failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
