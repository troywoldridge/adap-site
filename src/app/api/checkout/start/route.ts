// src/app/api/checkout/start/route.ts
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { and, eq, ne } from "drizzle-orm";

// Local asset map: your single source of truth for product images/names
import productAssetsRaw from "@/data/productAssets.json";

export const runtime = "nodejs";

/* ---------------------- Types & helpers ---------------------- */

type Asset = {
  product_id?: number;
  name?: string;
  matched_sku?: string | null;
  cloudflare_id?: string | null;
  cloudflare_image_id?: string | null;
};

type ProductAssetRow = {
  id?: number | string | null;            // local id (optional)
  sinalite_id?: number | string | null;   // SinaLite id (often what your cart uses)
  sku?: string | null;
  name?: string | null;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  cf_image_id?: string | null;            // optional single fallback
  [k: string]: unknown;
};

function toNum(v: unknown): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function pickCfId(r: ProductAssetRow): string | null {
  const ids = [
    r.cf_image_1_id,
    r.cf_image_2_id,
    r.cf_image_3_id,
    r.cf_image_4_id,
    r.cf_image_id,
  ];
  for (const raw of ids) {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (s) return s;
  }
  return null;
}

function titleCase(s?: string | null) {
  if (!s) return "";
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function niceName(a?: Asset, productId?: number) {
  if (!a) return `Product ${productId ?? ""}`.trim();
  return titleCase(a.name || a.matched_sku || `Product ${productId ?? ""}`);
}

function cfUrl(id?: string | null, variant = "public") {
  if (!id) return undefined;
  const hash = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH;
  // served by Cloudflare Images CDN (imagedelivery.net)
  return hash ? `https://imagedelivery.net/${hash}/${id}/${variant}` : undefined;
}

function originFromHeaders(h: Headers) {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

/* Build an index for fast lookup by either SinaLite id or local id */
const byProductId = new Map<number, Asset>();
(() => {
  const rows = (productAssetsRaw as ProductAssetRow[]) ?? [];
  for (const r of rows) {
    const cfid = pickCfId(r);
    const asset: Asset = {
      name: (typeof r.name === "string" ? r.name : undefined) ?? undefined,
      matched_sku: (typeof r.sku === "string" ? r.sku : null) ?? null,
      cloudflare_id: cfid,
      cloudflare_image_id: cfid,
    };

    // Key by both ids to be robust with whatever cartLines.productId stores
    const keys = [toNum(r.sinalite_id), toNum(r.id)].filter(
      (n): n is number => n !== null
    );
    for (const key of keys) {
      if (!byProductId.has(key)) byProductId.set(key, asset);
    }
  }
})();

/* ---------------------- Route handler ---------------------- */

export async function POST() {
  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Missing STRIPE_SECRET_KEY." },
        { status: 500 }
      );
    }
    const stripe = new Stripe(secret, { apiVersion: "2025-07-30.basil" });

    // Load cart by cookie session
    const sid = (await cookies()).get("sid")?.value ?? "";
    if (!sid)
      return NextResponse.json(
        { ok: false, error: "No session/cart." },
        { status: 400 }
      );

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

    if (!cart)
      return NextResponse.json(
        { ok: false, error: "Cart not found." },
        { status: 404 }
      );

    if (!cart.selectedShipping) {
      return NextResponse.json(
        { ok: false, error: "Select a shipping method first." },
        { status: 400 }
      );
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
      return NextResponse.json(
        { ok: false, error: "Your cart is empty." },
        { status: 400 }
      );
    }

    const currency: "USD" | "CAD" = cart.currency === "CAD" ? "CAD" : "USD";

    // Stripe line items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = rows.map(
      (r) => {
        const a = byProductId.get(Number(r.productId));
        const name = niceName(a, r.productId);
        const img = cfUrl(a?.cloudflare_id ?? a?.cloudflare_image_id);
        const unit = Math.round(Number(r.unitPriceCents ?? 0)); // already cents
        const qty = Math.max(1, Math.floor(Number(r.quantity ?? 1)));

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
      }
    );

    // Add shipping line (priced earlier from SinaLite per docs)
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
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
