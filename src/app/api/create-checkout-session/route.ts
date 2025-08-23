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

async function getUnitPrice(
  origin: string,
  productId: number,
  optionIds: number[],
  store: "US" | "CA"
) {
  const res = await fetch(
    `${origin}/api/sinalite/price/${productId}?store=${store}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ optionIds }),
      cache: "no-store",
    }
  );
  if (!res.ok) return 0;
  const json = await res.json().catch(() => ({} as any));
  const n = Number(json?.price ?? json?.unitPrice ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const origin = originFromHeaders(h);
    const jar = await cookies();

    const body = await req.json().catch(() => ({} as any));
    const shippingFromBody: SelectedShipping =
      body?.shipping ?? body?.selectedShipping ?? null;

    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value;
    if (!sid) {
      return NextResponse.json(
        { ok: false, error: "missing_sid" },
        { status: 400 }
      );
    }

    const [cart] = await db
      .select()
      .from(carts)
      .where(and(eq(carts.sid, sid), eq(carts.status, "open")))
      .limit(1);

    if (!cart) {
      return NextResponse.json(
        { ok: false, error: "cart_not_found" },
        { status: 404 }
      );
    }

    const lines = await db
      .select()
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    // Prefer shipping sent from client; fallback to DB columns
    const selectedShipping: SelectedShipping =
      shippingFromBody ??
      (cart as any)?.selectedShipping ??
      (cart as any)?.shipping ??
      null;

    const store: "US" | "CA" =
      selectedShipping?.country === "CA" ? "CA" : "US";
    const currency: "usd" | "cad" = store === "CA" ? "cad" : "usd";

    // Price/normalize all items from Sinalite at checkout time (authoritative)
    const priced = await Promise.all(
      lines.map(async (ln) => {
        const unitPrice = await getUnitPrice(
          origin,
          ln.productId,
          (ln.optionIds as any) ?? [],
          store
        );
        return {
          productId: ln.productId,
          quantity: Math.max(1, Math.min(9999, Number(ln.quantity || 1))),
          optionIds: (ln.optionIds as any) ?? [],
          unitPrice,
        };
      })
    );

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const p of priced) {
      if (!Number.isFinite(p.unitPrice) || p.unitPrice <= 0) continue;
      line_items.push({
        quantity: p.quantity,
        price_data: {
          currency,
          unit_amount: Math.round(p.unitPrice * 100),
          product_data: {
            name: `Product ${p.productId}`,
            metadata: {
              productId: String(p.productId),
              optionIds: JSON.stringify(p.optionIds ?? []),
            },
          },
        },
      });
    }

    if (
      selectedShipping &&
      Number.isFinite(selectedShipping.cost) &&
      Number(selectedShipping.cost) > 0
    ) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(Number(selectedShipping.cost) * 100),
          product_data: {
            name: `Shipping — ${selectedShipping.carrier} ${selectedShipping.method}`,
            metadata: {
              kind: "shipping",
              carrier: selectedShipping.carrier,
              method: selectedShipping.method,
            },
          },
        },
      });
    }

    if (line_items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no_billable_items" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      allow_promotion_codes: true,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart/review`,
      metadata: {
        sid,
        cartId: cart.id,
        store,
        shipping: JSON.stringify(selectedShipping ?? null),
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error("create-checkout-session failed", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
