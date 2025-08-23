import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { stripe } from "@/lib/stripe"; // your Stripe init
// We’ll reuse your existing /api/cart response for prices

function baseUrlFromHeaders(h: Headers) {
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const base = baseUrlFromHeaders(h);
    const jar = await cookies();
    const cookieHeader = jar.getAll().map(c => `${c.name}=${c.value}`).join("; ");

    // Pull the cart (server already computes unitPrice & currency)
    const cartRes = await fetch(`${base}/api/cart`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!cartRes.ok) {
      return NextResponse.json({ ok: false, error: "cart_fetch_failed" }, { status: 400 });
    }
    const cartJson = await cartRes.json();
    const cart = cartJson?.cart;
    const items = Array.isArray(cart?.items) ? cart.items : [];
    const currency: "usd" | "cad" = (cart?.currency === "CAD" ? "cad" : "usd");

    if (items.length === 0) {
      return NextResponse.json({ ok: false, error: "cart_empty" }, { status: 400 });
    }

    const line_items = items.map((it: any) => ({
      quantity: Math.max(1, Number(it.quantity || 1)),
      price_data: {
        currency,
        unit_amount: Math.round((Number(it.unitPrice || 0)) * 100),
        product_data: {
          name: it.name || `Product ${it.productId}`,
          metadata: {
            productId: String(it.productId),
            optionIds: JSON.stringify(it.optionIds || []),
          },
        },
      },
    }));

    // If you want to add selected shipping later, you can include it as a line item too.

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cart`,
      metadata: {
        cartId: cart.id,
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error("/api/checkout/session failed:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
