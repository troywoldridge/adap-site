// src/app/api/create-payment-intent/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { getCartCreditsCents } from "@/lib/cartCredits";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(_req: NextRequest) {
  try {
    const { userId } = await auth(); // ✅ fix: await + correct var

    const jar = await cookies();
    const sid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value ?? null;
    const cartIdCookie = jar.get("cartId")?.value ?? null;

    // 1) Find an open cart by cartId cookie first, then by SID
    let cartRow:
      | {
          id: string;
          currency: string | null;
          selectedShipping: { cost?: number | string | null } | null;
        }
      | null = null;

    if (cartIdCookie) {
      const [byId] =
        (await db
          .select({
            id: carts.id,
            currency: carts.currency,
            selectedShipping: carts.selectedShipping,
          })
          .from(carts)
          .where(and(eq(carts.id, cartIdCookie), ne(carts.status, "closed")))
          .limit(1)) ?? [];
      cartRow = byId ?? null;
    }

    if (!cartRow && sid) {
      const [bySid] =
        (await db
          .select({
            id: carts.id,
            currency: carts.currency,
            selectedShipping: carts.selectedShipping,
          })
          .from(carts)
          .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
          .limit(1)) ?? [];
      cartRow = bySid ?? null;
    }

    if (!cartRow) {
      return NextResponse.json({ ok: false, error: "no_open_cart" }, { status: 400 });
    }

    // 2) Compute totals (server-authoritative; aligned with SinaLite API documentation)
    const rows = await db
      .select({
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cartRow.id));

    const subtotalCents = rows.reduce((sum, r) => {
      const qty = Number(r.quantity ?? 0);
      const unit = Number(r.unitPriceCents ?? 0);
      const line = Number.isFinite(Number(r.lineTotalCents)) ? Number(r.lineTotalCents) : qty * unit;
      return sum + (Number.isFinite(line) ? line : 0);
    }, 0);

    const shipCents = Math.round(Number(cartRow.selectedShipping?.cost ?? 0) * 100) || 0;
    const taxCents = 0; // integrate tax later
    const creditsCents = await getCartCreditsCents(cartRow.id);
    const totalCents = Math.max(0, subtotalCents + shipCents + taxCents - creditsCents);

    const ordersCurrency = String(cartRow.currency || "USD").toUpperCase() as "USD" | "CAD";
    const stripeCurrency = (ordersCurrency === "CAD" ? "cad" : "usd") as "usd" | "cad";

    // 3) Create PaymentIntent
    const intent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: stripeCurrency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        sid: sid ?? "",
        cartId: cartRow.id,
        userId: userId ?? "", // ✅ tag the PI for clean attribution
      },
    });

    return NextResponse.json({
      ok: true,
      clientSecret: intent.client_secret,
      amount: totalCents,
      currency: stripeCurrency,
    });
  } catch (e: any) {
    console.error("/api/create-payment-intent POST failed:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
