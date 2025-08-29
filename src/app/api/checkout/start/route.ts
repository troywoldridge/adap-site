// src/app/api/checkout/start/route.ts
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { and, eq, ne } from "drizzle-orm";

// Local asset maps to pretty up product names/images
import productAssetsRaw from "@/data/productAssets.json";
import imagesAssetsRaw from "@/data/images.json";

export const runtime = "nodejs";

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

function originFromHeaders(h: Headers) {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST() {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ ok: false, error: "Missing STRIPE_SECRET_KEY." }, { status: 500 });
    }
    const stripe = new Stripe(secret, { apiVersion: "2025-07-30.basil" });

    // Build asset index
    const byProductId = new Map<number, Asset>();
    for (const a of productAssetsRaw as any[]) if (typeof a?.product_id === "number" && !byProductId.has(a.product_id)) byProductId.set(a.product_id, a);
    for (const a of imagesAssetsRaw as any[]) if (typeof a?.product_id === "number" && !byProductId.has(a.product_id)) byProductId.set(a.product_id, a);

    // Load cart
    const sid = (await cookies()).get("sid")?.value ?? "";
    if (!sid) return NextResponse.json({ ok: false, error: "No session/cart." }, { status: 400 });

    const [cart] =
      (await db
        .select({
          id: carts.id,
          currency: carts.currency,
          selectedShipping: carts.selectedShipping,
        })
        .from(carts)
        .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
        .limit(1)) ?? [];
    if (!cart) return NextResponse.json({ ok: false, error: "Cart not found." }, { status: 404 });
    if (!cart.selectedShipping) {
      return NextResponse.json({ ok: false, error: "Select a shipping method first." }, { status: 400 });
    }

    const rows = await db
      .select({
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Your cart is empty." }, { status: 400 });
    }

    const currency: "USD" | "CAD" = cart.currency === "CAD" ? "CAD" : "USD";

    // Build Stripe line_items from snapshot prices
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = rows.map((r) => {
      const a = byProductId.get(Number(r.productId));
      const name = niceName(a, r.productId);
      const img = cfUrl(a?.cloudflare_id ?? a?.cloudflare_image_id);
      const unit = Number(r.unitPriceCents ?? 0);
      const qty = Number(r.quantity ?? 1);

      return {
        quantity: qty,
        price_data: {
          currency,
          unit_amount: unit,
          product_data: {
            name,
            ...(img ? { images: [img] } : {}),
            metadata: { productId: String(r.productId) },
          },
        },
      };
    });

    // Add shipping as a fixed line item (we already priced with Sinalite)
    const shipLabel = `${cart.selectedShipping.carrier} ${cart.selectedShipping.method}`.trim();
    const shipCents = Math.round(Number(cart.selectedShipping.cost || 0) * 100);
    if (shipCents > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: shipCents,
          product_data: { name: `Shipping — ${shipLabel}` },
        },
      });
    }

    const h = await headers();
    const origin = originFromHeaders(h);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/checkout/success?sid=${encodeURIComponent(sid)}`,
      cancel_url: `${origin}/cart/review`,
      metadata: { cart_id: String(cart.id), sid },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
