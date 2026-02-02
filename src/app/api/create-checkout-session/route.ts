// src/app/api/create-checkout-session/route.ts
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { carts } from "@/lib/db/schema/cart";
import { cartLines } from "@/lib/db/schema/cartLines";
import { and, eq, ne } from "drizzle-orm";

// Cloudflare Images helper + local product assets (served via Cloudflare CDN)
import { cfImage } from "@/lib/cfImages";
import productAssetsRaw from "@/data/productAssets.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------------- helpers (origin, assets, CF) ---------------- */
function originFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

type ProductAsset = {
  id?: number | string | null;
  sku?: string | null;
  name?: string | null;
  cf_image_id?: string | null;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  cloudflare_id?: string | null;
  cloudflare_image_id?: string | null;
  [k: string]: unknown;
};

const assetsById = new Map<number, ProductAsset>();
for (const p of productAssetsRaw as ProductAsset[]) {
  const id = Number(p?.id);
  if (Number.isFinite(id) && !assetsById.has(id)) assetsById.set(id, p);
}

function titleCase(s?: string | null) {
  if (!s) return "";
  return s.replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstCfIdFromAsset(p?: ProductAsset | null): string | null {
  if (!p) return null;
  const refs = [
    p.cf_image_1_id, p.cf_image_2_id, p.cf_image_3_id, p.cf_image_4_id,
    p.cf_image_id, p.cloudflare_image_id, p.cloudflare_id,
  ].map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  return refs[0] || null;
}

function productName(productId: number): string {
  const row = assetsById.get(productId);
  return (
    (row?.name && titleCase(row.name)) ||
    (row?.sku ?? "") ||
    (Number.isFinite(productId) ? `Product ${productId}` : "Product")
  );
}

function productSku(productId: number): string | undefined {
  const row = assetsById.get(productId);
  return typeof row?.sku === "string" && row.sku.trim() ? row.sku.trim() : undefined;
}

function productImageUrl(productId: number): string | undefined {
  const row = assetsById.get(productId);
  const id = firstCfIdFromAsset(row);
  if (!id) return undefined;
  // Serve through Cloudflare CDN variants 🚀
  return cfImage(id, "productCard") || cfImage(id, "public") || undefined;
}

/* ---------------- main handler ---------------- */
export async function POST(_req: NextRequest) {
  try {
    const h = await headers();
    const origin = originFromHeaders(h);

    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value;
    if (!sid) return NextResponse.json({ ok: false, error: "missing_sid" }, { status: 400 });

    // Load open cart (before Stripe creation!)
    const [cartRow] =
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

    if (!cartRow) return NextResponse.json({ ok: false, error: "cart_not_found" }, { status: 404 });

    // Load lines
    const lineRows = await db
      .select({
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
        optionIds: cartLines.optionIds,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cartRow.id));

    if (lineRows.length === 0) return NextResponse.json({ ok: false, error: "empty_cart" }, { status: 400 });

    // Shipping selection (for country/state/zip + shipping line)
    const ship = (cartRow as any)?.selectedShipping ?? null;

    // Build Stripe line_items with name, image, SKU; use DB unitPriceCents (already validated earlier)
    const currency = (cartRow.currency === "CAD" ? "cad" : "usd") as "usd" | "cad";
    const line_items: {
      quantity: number;
      price_data: {
        currency: "usd" | "cad";
        unit_amount: number;
        product_data: { name: string; images?: string[]; metadata?: Record<string, string> };
      };
    }[] = [];

    for (const r of lineRows) {
      const pid = Number(r.productId);
      const qty = Math.max(1, Number(r.quantity ?? 1));
      const finalUnitCents = Math.max(0, Number(r.unitPriceCents ?? 0));

      const name = productName(pid);
      const imageUrl = productImageUrl(pid);
      const sku = productSku(pid);

      line_items.push({
        quantity: qty,
        price_data: {
          currency,
          unit_amount: finalUnitCents,
          product_data: {
            name,
            ...(imageUrl ? { images: [imageUrl] } : {}),
            ...(sku ? { metadata: { sku } } : {}),
          },
        },
      });
    }

    // Optional shipping line (to match Review page)
    const shippingCents = Math.round(Number(ship?.cost ?? 0) * 100);
    if (Number.isFinite(shippingCents) && shippingCents > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: shippingCents,
          product_data: { name: ship?.method ?? "Shipping" },
        },
      });
    }

      const success_url = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`; // ✅
      const cancel_url  = `${origin}/cart/review?canceled=1`;                           // ✅

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items,
        metadata: { sid, cartId: String(cartRow.id) }, // keep this so webhooks can close the cart
        success_url,
        cancel_url,
      });
      return NextResponse.json({ ok: true, url: session.url });

          return NextResponse.json({ ok: true, url: session.url });
        } catch (e: any) {
          console.error("create-checkout-session failed", e);
          return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
        }
      }
