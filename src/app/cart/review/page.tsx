// src/app/cart/review/page.tsx
import "server-only";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { getDefaultAddress } from "@/lib/addresses";

// Local asset maps (no DB join; images via Cloudflare CDN)
import productAssetsRaw from "@/data/productAssets.json";
import imagesAssetsRaw from "@/data/images.json";

// Client components
import CartShippingEstimator from "@/components/CartShippingEstimator";
import ChangeShippingButton from "@/components/ChangeShippingButton";

// Next.js runtime hints
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Asset = {
  product_id?: number;
  name?: string;
  matched_sku?: string | null;
  cloudflare_id?: string | null;
  cloudflare_image_id?: string | null;
};

const byProductId = new Map<number, Asset>();
for (const a of (productAssetsRaw as any[])) {
  if (typeof a?.product_id === "number" && !byProductId.has(a.product_id)) byProductId.set(a.product_id, a);
}
for (const a of (imagesAssetsRaw as any[])) {
  if (typeof a?.product_id === "number" && !byProductId.has(a.product_id)) byProductId.set(a.product_id, a);
}

function titleCase(s: string) {
  return s?.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";
}
function niceName(a?: Asset, productId?: number) {
  if (!a) return `Product ${productId ?? ""}`.trim();
  return titleCase(a.name || a.matched_sku || `Product ${productId ?? ""}`);
}
function cfUrl(imageId?: string | null, variant = "public") {
  if (!imageId) return "/placeholder.svg";
  return `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH}/${imageId}/${variant}`;
}
function moneyFmt(amount: number, currency: "USD" | "CAD") {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount); }
  catch { return `$${amount.toFixed(2)}`; }
}

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

  const lines = rows.map((r) => {
    const asset = byProductId.get(Number(r.productId));
    const imageId = asset?.cloudflare_id ?? asset?.cloudflare_image_id ?? null;
    const qty = Number(r.quantity ?? 0);
    const unitCents = Number(r.unitPriceCents ?? 0);
    const totalCents = Number.isFinite(Number(r.lineTotalCents))
      ? Number(r.lineTotalCents)
      : unitCents * qty;

    return {
      id: r.id,
      productId: r.productId,
      quantity: qty,
      name: niceName(asset, r.productId),
      imageId,
      unit: unitCents / 100,
      total: totalCents / 100,
    };
  });

  return { cart, lines };
}

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

  // Prefill shipping estimator from default address
  const { userId } = auth();
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
      <h1 className="mb-6 text-2xl font-semibold">Review your cart</h1>

      {/* Lines */}
      <section className="space-y-4">
        {lines.map((line) => (
          <article key={line.id} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <Image
                src={cfUrl(line.imageId, "public")}
                alt={line.name}
                width={80}
                height={80}
                className="rounded border object-cover"
              />
              <div>
                <div className="font-medium">{line.name}</div>
                <div className="text-sm text-neutral-600">
                  Qty {line.quantity} • {moneyFmt(line.unit, currency)} each
                </div>
              </div>
            </div>
            <div className="text-right font-semibold">{moneyFmt(line.total, currency)}</div>
          </article>
        ))}
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

      {/* Shipping estimator OR selected card */}
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
