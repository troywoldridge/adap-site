// src/app/cart/review/page.tsx
import "server-only";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartArtwork } from "@/db/schema/cartArtwork";
import { and, eq, ne, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getDefaultAddress } from "@/lib/addresses";
import CartArtworkThumb from "@/components/CartArtworkThumb";
import ClientToastHub from "@/components/ClientToastHub";
import AddAnotherSideButton from "@/components/AddAnotherSideButton";



// Cloudflare Images URL builder (serves via Cloudflare CDN)
import { cfImage } from "@/lib/cfImages";

// Local image source of truth (Cloudflare IDs live here)
import productAssetsRaw from "@/data/productAssets.json";

// Client components
import CartShippingEstimator from "@/components/CartShippingEstimator";
import ChangeShippingButton from "@/components/ChangeShippingButton";

// Next.js runtime hints
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ----------------------------- Types ----------------------------- */
type ProductAsset = {
  id?: number | string | null;
  sku?: string | null;
  name?: string | null;
  // Cloudflare image columns (any one may exist)
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
  unit: number;
  total: number;
  artworkUrls: string[];
};

/* ----------------------- Cloudflare helpers ---------------------- */

// Hard-code your real CF variant for cart thumbnails
const CARD_VARIANT = "productThumb" as const;

// Known good placeholder ID in your CF Images
const CF_PLACEHOLDER_ID = "a90ba357-76ea-48ed-1c65-44fff4401600";

/** Pick the best CF image ID from a product asset row. */
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

/** Build a final URL for a cart line’s product image (Cloudflare-first). */
function cartLineImageUrl(productId?: number | string | null): string {
  const pid = Number(productId);
  const row = Number.isFinite(pid) ? productAssetById.get(pid) : undefined;
  const ref = firstCfIdFromAsset(row) ?? CF_PLACEHOLDER_ID;

  // If a full URL sneaks in, passthrough
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;

  // Otherwise treat as Cloudflare image ID
  return (
    cfImage(ref, CARD_VARIANT) ||
    cfImage(ref, "public") ||
    "/placeholder.svg"
  );
}

/** Name fallback for cart lines if DB row lacks it. */
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
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function moneyFmt(amount: number, currency: "USD" | "CAD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/* ---------------------- Build fast lookup map --------------------- */
const productAssetById = new Map<number, ProductAsset>();
for (const p of productAssetsRaw as ProductAsset[]) {
  const id = Number(p?.id);
  if (Number.isFinite(id) && !productAssetById.has(id)) {
    productAssetById.set(id, p);
  }
}

/* ----------------------------- DB load ---------------------------- */
async function loadCart() {
  const sid = (await cookies()).get("sid")?.value ?? "";
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

  // Fetch any uploaded artwork URLs for these lines
  const lineIds = rows.map((r) => r.id);
  let artRows:
    | { cartLineId: string; side: number | null; url: string }[]
    | [] = [];

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

  // Group artwork by cartLineId & sort by side
  const artworkMap = new Map<string, string[]>();
  for (const a of artRows) {
    const key = a.cartLineId;
    if (!artworkMap.has(key)) artworkMap.set(key, []);
    artworkMap.get(key)!.push(a.url);
  }
  for (const [k, arr] of artworkMap) {
    // sort ascending by side when possible by reading side from URL order above
    // (side already implicitly grouped; if needed you can persist exact sort)
    // Keep as-is for now
    artworkMap.set(k, arr);
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

  // ✅ Clerk auth() is async in Next 15
  const { userId } = await auth();
  const defaultAddr = userId ? await getDefaultAddress(userId) : null;
  const initCountry = (defaultAddr?.country === "CA" ? "CA" : "US") as "US" | "CA";
  const initState = defaultAddr?.state ?? "";
  const initZip = defaultAddr?.postalCode ?? "";

  const subtotal = lines.reduce((acc, l) => acc + l.total, 0);
  const shipping = Number(cart.selectedShipping?.cost ?? 0);
  const tax = 0;
  const grandTotal = subtotal + shipping + tax;

  return (
  <main className="container mx-auto py-8">
    <ClientToastHub />
    <h1 className="mb-6 text-2xl font-semibold">Review your cart</h1>

    {/* Lines */}
    <section className="space-y-4">
      {lines.map((line) => {
        const productImg = cartLineImageUrl(line.productId);

        return (
          <article
            key={line.id}
            className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-start gap-4">
              {/* Product image (Cloudflare CDN) */}
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

                {/* ✅ Customer artwork thumbnails (side 1/2/etc) */}
                {line.artworkUrls.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {line.artworkUrls.map((u, i) => (
                      <CartArtworkThumb
                        key={`${line.id}-art-${i}`}
                        lineId={line.id}
                        productId={line.productId}
                        side={i + 1}
                        url={u}
                        totalSides={line.artworkUrls.length}
                      />
                    ))}

                    {/* Always offer to add one more side */}
                    <AddAnotherSideButton
                      productId={line.productId}
                      lineId={line.id}
                      currentSides={line.artworkUrls.length}
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
      <hr className="my-2" />
      <div className="flex justify-between py-2 text-lg font-bold">
        <span>Total</span>
        <span>{moneyFmt(grandTotal, currency)}</span>
      </div>
    </aside>

    {/* Shipping estimator OR selected card
        ⤷ Component calls your API route at /api/cart/estimate-shipping (SinaLite rates per their API docs). */}
    <div className="mt-6">
      {!cart.selectedShipping ? (
        <CartShippingEstimator
          initialCountry={initCountry}
          initialState={initState}
          initialZip={initZip}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Selected shipping</span>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {cart.selectedShipping.days ?? "–"} business {cart.selectedShipping.days === 1 ? "day" : "days"}
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