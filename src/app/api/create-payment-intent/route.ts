// src/app/api/create-payment-intent/route.ts
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { and, eq, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(_req: NextRequest) {
  try {
    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value;
    if (!sid) return NextResponse.json({ ok: false, error: "missing_sid" }, { status: 400 });

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

    if (!cart) return NextResponse.json({ ok: false, error: "cart_not_found" }, { status: 404 });

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
      const line = Number.isFinite(Number(r.lineTotalCents)) ? Number(r.lineTotalCents) : unit * qty;
      return sum + (Number.isFinite(line) ? line : 0);
    }, 0);

    const shipCents = Math.round(Number((cart as any)?.selectedShipping?.cost ?? 0) * 100);
    const totalCents = Math.max(0, subtotalCents + (Number.isFinite(shipCents) ? shipCents : 0));
    if (totalCents <= 0) return NextResponse.json({ ok: false, error: "amount_zero" }, { status: 400 });

    const currency = (cart.currency === "CAD" ? "cad" : "usd") as "usd" | "cad";

    const intent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { sid, cartId: String(cart.id) },
    });

    return NextResponse.json({ ok: true, clientSecret: intent.client_secret });
  } catch (e: any) {
    console.error("create-payment-intent failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
