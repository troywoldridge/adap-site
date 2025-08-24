// src/app/api/create-checkout-session/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

function originFromHeaders(h: Headers): string {
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

type SelectedShipping = {
  carrier: string;
  method: string;
  cost: number;
  days: number | null;
  currency: "USD" | "CAD";
  country: "US" | "CA";
  state: string;
  zip: string;
} | null;

function toNum(n: unknown, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const origin = originFromHeaders(h);
    const jar = await cookies();

    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value;
    if (!sid) return NextResponse.json({ ok: false, error: "missing_sid" }, { status: 400 });

    // cart + lines
    const [cart] = await db
      .select()
      .from(carts)
      .where(and(eq(carts.sid, sid), eq(carts.status, "open")))
      .limit(1);

    if (!cart) return NextResponse.json({ ok: false, error: "cart_not_found" }, { status: 404 });

    const lines = await db.select().from(cartLines).where(eq(cartLines.cartId, cart.id));

    const selectedShipping: SelectedShipping = (cart as any)?.selectedShipping ?? null;
    const store: "US" | "CA" = selectedShipping?.country === "CA" ? "CA" : "US";
    const currency: "usd" | "cad" = store === "CA" ? "cad" : "usd";

    // We already saved unitPrice on each line when the user priced it.
    // Multiply unitPrice * quantity, but pass quantity to Stripe (not pre-multiplied amount).
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const ln of lines) {
      const qty = Math.max(1, Math.min(9999, Math.floor(toNum((ln as any).quantity, 1))));
      const unit = toNum((ln as any).unitPrice, 0);
      if (!unit) continue;

      line_items.push({
        quantity: qty, // ← THIS fixes your $20 x 2 => $40
        price_data: {
          currency,
          unit_amount: Math.round(unit * 100),
          product_data: {
            name: `Product ${ln.productId}`,
            metadata: {
              productId: String(ln.productId),
              optionIds: JSON.stringify(((ln as any).optionIds ?? []) as number[]),
              cartLineId: String(ln.id),
            },
          },
        },
      });
    }

    // shipping as its own line if chosen
    if (selectedShipping && toNum(selectedShipping.cost) > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(toNum(selectedShipping.cost) * 100),
          product_data: {
            name: `Shipping — ${selectedShipping.carrier} ${selectedShipping.method}`,
            metadata: { kind: "shipping" },
          },
        },
      });
    }

    if (line_items.length === 0) {
      return NextResponse.json({ ok: false, error: "no_billable_items" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      allow_promotion_codes: true,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart/review`,
      metadata: {
        sid,
        cartId: String(cart.id),
        store,
        shipping: JSON.stringify(selectedShipping ?? null),
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error("create-checkout-session failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
