// src/app/api/create-payment-intent/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import stripe from "@/lib/stripe";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { and, eq, ne } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(_req: NextRequest) {
  try {
    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value;
    if (!sid) return NextResponse.json({ error: "missing_sid" }, { status: 400 });

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

    if (!cart) return NextResponse.json({ error: "cart_not_found" }, { status: 404 });

    const rows = await db
      .select({
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    const merchandise = rows.reduce((sum, r) => {
      const q = Number(r.quantity ?? 0);
      const u = Number(r.unitPriceCents ?? 0);
      return sum + (Number.isFinite(q) && Number.isFinite(u) ? q * u : 0);
    }, 0);

    const shipCents = Math.round(Number((cart as any)?.selectedShipping?.cost || 0) * 100);
    const amount = Math.max(50, merchandise + (shipCents > 0 ? shipCents : 0)); // min 50¢ safety

    const currency = cart.currency === "CAD" ? "cad" : "usd";

    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { sid, cartId: String(cart.id) },
    });

    return NextResponse.json({ clientSecret: pi.client_secret });
  } catch (e: any) {
    console.error("create-payment-intent failed", e);
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
