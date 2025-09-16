// src/app/cart/review/page.tsx
import "server-only";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { and, eq, ne, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartArtwork } from "@/db/schema/cartArtwork";

import { auth } from "@clerk/nextjs/server";
import { getDefaultAddress } from "@/lib/addresses";

import CartArtworkThumb from "@/components/CartArtworkThumb";
import ClientToastHub from "@/components/ClientToastHub";
import HashToast from "@/components/HashToast";
import AddAnotherSideButton from "@/components/AddAnotherSideButton";
import CartShippingEstimator from "@/components/CartShippingEstimator";
import ChangeShippingButton from "@/components/ChangeShippingButton";
import CartCreditsRow from "@/components/CartCreditsRow";
import { getCartCreditsCents } from "@/lib/cartCredits";

// Cloudflare Images URL builder (serves via Cloudflare CDN)
import { cfImage } from "@/lib/cfImages";

// Local product assets (Cloudflare image IDs live here)
import productAssetsRaw from "@/data/productAssets.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ----------------------------- Types ----------------------------- */
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

type LineVM = {
  id: string;
  productId: number;
  quantity: number;
  name: string;
  unit: number;      // unit price (dollars)
  total: number;     // line total (dollars)
  artworkUrls: string[];
  optionIds: number[]; // ✅ needed for SinaLite shipping estimate
};

/* ----------------------- Cloudflare helpers ---------------------- */
const CARD_VARIANT = "productThumb" as const;
const CF_PLACEHOLDER_ID = "a90ba357-76ea-48ed-1c65-44fff4401600";

function firstCfIdFromAsset(p?: ProductAsset | null): string | null {
  if (!p) return null;
  const refs = [
    p.cf_image_1_id,
    p.cf_image_2_id,
    p.cf_image_3_id,
    p.cf_image_4_id,
    p.cf_image_id,
    p.cloudflare_image_id,
    p.cloudflare_id,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return refs[0] || null;
}

const productAssetById = new Map<number, ProductAsset>();
for (const p of productAssetsRaw as ProductAsset[]) {
  const id = Number(p?.id);
  if (Number.isFinite(id) && !productAssetById.has(id)) {
    productAssetById.set(id, p);
  }
}

function cartLineImageUrl(productId?: number | string | null): string {
  const pid = Number(productId);
  const row = Number.isFinite(pid) ? productAssetById.get(pid) : undefined;
  const ref = firstCfIdFromAsset(row) ?? CF_PLACEHOLDER_ID;
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  return cfImage(ref, CARD_VARIANT) || cfImage(ref, "public") || "/placeholder.svg";
}

function nameFallback(productId?: number | string | null): string {
  const pid = Number(productId);
  const row = Number.isFinite(pid) ? productAssetById.get(pid) : undefined;
  return (
    (row?.name && titleCase(row.name)) ||
    (row?.sku ?? "") ||
    (pid ? `Product ${pid}` : "Product")
  );
}

function titleCase(s?: string | null) {
  if (!s) return "";
  return s.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function moneyFmt(amount: number, currency: "USD" | "CAD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/* ---- normalize optionIds from various DB shapes (json, text, pg array) ---- */
function normalizeOptIds(v: unknown): number[] {
  try {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return [];
      if (s.startsWith("[")) {
        // JSON array
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
      }
      if (s.startsWith("{") && s.endsWith("}")) {
        // Postgres text array format "{1,2,3}"
        return s
          .slice(1, -1)
          .split(",")
          .map((x) => Number(x))
          .filter(Number.isFinite);
      }
    }
  } catch {}
  return [];
}

/* ----------------------------- DB load ---------------------------- */
async function loadCart() {
  const jar = await cookies();
  const sid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value ?? "";
  if (!sid) return null;

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

  if (!cart) return null;

  const rows = await db
    .select({
      id: cartLines.id,
      productId: cartLines.productId,
      quantity: cartLines.quantity,
      unitPriceCents: cartLines.unitPriceCents,
      lineTotalCents: cartLines.lineTotalCents,
      optionIds: cartLines.optionIds,
    })
    .from(cartLines)
    .where(eq(cartLines.cartId, cart.id));

  const lineIds = rows.map((r) => r.id);
  let artRows: { cartLineId: string; side: number | null; url: string }[] = [];
  if (lineIds.length > 0) {
    artRows = await db
      .select({
        cartLineId: cartArtwork.cartLineId,
        side: cartArtwork.side,
        url: cartArtwork.url,
      })
      .from(cartArtwork)
      .where(inArray(cartArtwork.cartLineId, lineIds));
  }

  const artworkMap = new Map<string, string[]>();
  for (const a of artRows) {
    const key = a.cartLineId;
    if (!artworkMap.has(key)) artworkMap.set(key, []);
    artworkMap.get(key)!.push(a.url);
  }

  const lines: LineVM[] = rows.map((r) => {
    const qty = Number(r.quantity ?? 0);
    const unitCents = Number(r.unitPriceCents ?? 0);
    const totalCents = Number.isFinite(Number(r.lineTotalCents))
      ? Number(r.lineTotalCents)
      : unitCents * qty;

    return {
      id: r.id,
      productId: Number(r.productId),
      quantity: qty,
      name: nameFallback(r.productId),
      unit: unitCents / 100,
      total: totalCents / 100,
      artworkUrls: artworkMap.get(r.id) ?? [],
      optionIds: normalizeOptIds(r.optionIds), // ✅ include optionIds for SinaLite
    };
  });

  return { cart, lines };
}

/* ------------------------------ Page ------------------------------ */
export default async function ReviewCartPage() {
  const data = await loadCart();

  if (!data || data.lines.length === 0) {
    return (
      <main className="container mx-auto py-8">
        <h1 className="text-2xl font-semibold">Your cart</h1>
        <p className="mt-4 text-neutral-600">Your cart is empty.</p>
      </main>
    );
  }

  const { cart, lines } = data;
  const currency = (cart.currency as "USD" | "CAD") ?? "USD";

  // Clerk auth() is async in Next 15
  const { userId } = await auth();
  const defaultAddr = userId ? await getDefaultAddress(userId) : null;
  const initCountry = (defaultAddr?.country === "CA" ? "CA" : "US") as "US" | "CA";
  const initState = defaultAddr?.state ?? "";
  const initZip = defaultAddr?.postalCode ?? "";

  // Dollars for UI math
  const subtotal = lines.reduce((acc, l) => acc + l.total, 0);
  const shipping = Number(cart.selectedShipping?.cost ?? 0);
  const tax = 0;

  // Credits
  const creditsCents = await getCartCreditsCents(cart.id);
  const credits = Math.max(0, (creditsCents || 0) / 100);
  const grandTotal = Math.max(0, subtotal + shipping + tax - credits);

  // ✅ Build minimal lines for estimator (SinaLite expects productId + options)
  const miniLines = lines.map((l) => ({
    productId: l.productId,
    optionIds: Array.isArray(l.optionIds) ? l.optionIds : [],
    quantity: l.quantity || 1,
  }));

  return (
    <main className="container mx-auto py-8">
      <ClientToastHub />
      <HashToast />
      <h1 className="mb-6 text-2xl font-semibold">Review your cart</h1>

      {/* Lines */}
      <section className="space-y-4">
        {lines.map((line) => {
          const productImg = cartLineImageUrl(line.productId);
          const hasArtwork = (line.artworkUrls?.length ?? 0) > 0;

          return (
            <article
              key={line.id}
              className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-start md:justify-between"
            >
              <div className="flex items-start gap-4">
                {/* Product image (Cloudflare Images CDN) */}
                <Image
                  src={productImg}
                  alt={line.name}
                  width={80}
                  height={80}
                  className="rounded border object-cover"
                  unoptimized
                />

                <div>
                  <div className="font-medium">{line.name}</div>
                  <div className="text-sm text-neutral-600">
                    Qty {line.quantity} • {moneyFmt(line.unit, currency)} each
                  </div>

                  {/* Customer artwork thumbnails */}
                  {hasArtwork ? (
                    <div className="mt-2 flex flex-wrap gap-3">
                      {line.artworkUrls!.map((u, i) => (
                        <CartArtworkThumb
                          key={`${line.id}-art-${i}`}
                          url={u}
                          alt={`Artwork side ${i + 1}`}
                          size={80}
                          openLabel="Open"
                        />
                      ))}

                      <AddAnotherSideButton
                        productId={line.productId}
                        lineId={line.id}
                        currentSides={line.artworkUrls!.length}
                      />
                    </div>
                  ) : (
                    <div className="mt-2">
                      <AddAnotherSideButton
                        productId={line.productId}
                        lineId={line.id}
                        currentSides={0}
                        label="Upload artwork"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right font-semibold">
                {moneyFmt(line.total, currency)}
              </div>
            </article>
          );
        })}
      </section>

      {/* Totals */}
      <aside className="mt-8 rounded-lg border bg-neutral-50 p-4">
        <div className="flex justify-between py-2">
          <span>Subtotal</span>
          <span>{moneyFmt(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between py-2">
          <span>
            Shipping
            {cart.selectedShipping?.method ? ` — ${cart.selectedShipping.method}` : " (estimated)"}
          </span>
          <span>{moneyFmt(shipping, currency)}</span>
        </div>
        <div className="flex justify-between py-2">
          <span>Tax</span>
          <span>{moneyFmt(tax, currency)}</span>
        </div>

        <CartCreditsRow creditsCents={creditsCents} currency={currency} />

        <hr className="my-2" />
        <div className="flex justify-between py-2 text-lg font-bold">
          <span>Total</span>
          <span>{moneyFmt(grandTotal, currency)}</span>
        </div>
      </aside>

      {/* Shipping estimator OR selected card */}
      <div className="mt-6">
        {!cart.selectedShipping ? (
          <CartShippingEstimator
            initialCountry={initCountry}
            initialState={initState}
            initialZip={initZip}
            lines={miniLines}              // ✅ send lines
            currency={currency}            // helpful for UI formatting
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Selected shipping</span>
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {cart.selectedShipping.days ?? "–"} business{" "}
                    {cart.selectedShipping.days === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="mt-1 truncate text-sm text-gray-600">
                  {cart.selectedShipping.carrier} — {cart.selectedShipping.method}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold">
                  {moneyFmt(Number(cart.selectedShipping.cost || 0), currency)}
                </div>
                <ChangeShippingButton />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="mt-6 flex justify-end gap-3">
        <Link
          href="/cart"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm font-semibold text-gray-900 hover:bg-gray-200"
        >
          Back to cart
        </Link>
        <Link
          href="/checkout"
          className={`inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white shadow hover:bg-blue-800 ${
            !cart.selectedShipping ? "pointer-events-none opacity-50" : ""
          }`}
          aria-disabled={!cart.selectedShipping}
        >
          Continue to checkout
        </Link>
      </div>
    </main>
  );
}
