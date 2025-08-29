// src/app/api/create-checkout-session/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import stripe from "@/lib/stripe";            // ← use your centralized client (handles API version!)
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { and, eq, ne } from "drizzle-orm";

// local asset maps to improve product names/images (Cloudflare Images CDN)
import productAssetsRaw from "@/data/productAssets.json";
import imagesAssetsRaw from "@/data/images.json";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

function originFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
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

type Asset = {
  product_id?: number;
  name?: string;
  matched_sku?: string | null;
  cloudflare_id?: string | null;
  cloudflare_image_id?: string | null;
};

function titleCase(s?: string | null) {
  if (!s) return "";
  return s.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
function niceName(a?: Asset, productId?: number) {
  if (!a) return `Product ${productId ?? ""}`.trim();
  return titleCase(a.name || a.matched_sku || `Product ${productId ?? ""}`);
}
function cfUrl(id?: string | null, variant = "public") {
  if (!id) return undefined;
  const hash = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH;
  return hash ? `https://imagedelivery.net/${hash}/${id}/${variant}` : undefined;
}

export async function POST(_req: NextRequest) {
  try {
    const h = await headers();
    const origin = originFromHeaders(h);
    const jar = await cookies();

    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value;
    if (!sid) return NextResponse.json({ ok: false, error: "missing_sid" }, { status: 400 });

    // Build product asset index once
    const byProductId = new Map<number, Asset>();
    for (const a of productAssetsRaw as any[])
      if (typeof a?.product_id === "number" && !byProductId.has(a.product_id)) byProductId.set(a.product_id, a);
    for (const a of imagesAssetsRaw as any[])
      if (typeof a?.product_id === "number" && !byProductId.has(a.product_id)) byProductId.set(a.product_id, a);

    // Load cart
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

    const lines = await db
      .select({
        id: cartLines.id,
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents, // snapshot cents
        optionIds: cartLines.optionIds,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    const selectedShipping: SelectedShipping = (cart as any)?.selectedShipping ?? null;
    const store: "US" | "CA" = selectedShipping?.country === "CA" ? "CA" : "US";
    const stripeCurrency: "usd" | "cad" =
      (cart.currency === "CAD" || selectedShipping?.currency === "CAD") ? "cad" : "usd";

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const ln of lines) {
      const qty = Math.max(1, Math.min(9999, Number(ln.quantity ?? 1)));
      const unitCents = Math.max(0, Number(ln.unitPriceCents ?? 0));
      if (!unitCents || !qty) continue;

      const asset = byProductId.get(Number(ln.productId));
      const name = niceName(asset, ln.productId);
      const image = cfUrl(asset?.cloudflare_id ?? asset?.cloudflare_image_id);

      line_items.push({
        quantity: qty,
        price_data: {
          currency: stripeCurrency,
          unit_amount: unitCents, // ✅ cents snapshot
          product_data: {
            name,
            ...(image ? { images: [image] } : {}),
            metadata: {
              productId: String(ln.productId),
              optionIds: JSON.stringify((ln.optionIds ?? []) as number[]),
              cartLineId: String(ln.id),
            },
          },
        },
      });
    }

    // Add Sinalite shipping (per Sinalite API docs, we snapshot the chosen rate)
    const shipCents = selectedShipping ? Math.round(Number(selectedShipping.cost || 0) * 100) : 0;
    if (shipCents > 0) {
      const label = `Shipping — ${selectedShipping!.carrier} ${selectedShipping!.method}`.trim();
      line_items.push({
        quantity: 1,
        price_data: {
          currency: stripeCurrency,
          unit_amount: shipCents,
          product_data: { name: label, metadata: { kind: "shipping" } },
        },
      });
    }

    if (line_items.length === 0) {
      return NextResponse.json({ ok: false, error: "no_billable_items" }, { status: 400 });
    }

    // 👇 Force Link alongside cards (ensure Link is enabled in Stripe Dashboard)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "link"],   // do NOT add automatic_payment_methods with this
      line_items,
      allow_promotion_codes: true,

      // Optional: set email if you have it to speed up Link OTP
      // customer_email: knownEmailFromYourUser ?? undefined,

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
