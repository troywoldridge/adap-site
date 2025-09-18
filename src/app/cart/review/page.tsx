// src/app/cart/review/page.tsx
import "server-only";
import Image from "@/components/ImageSafe";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";

import CartArtworkThumb from "@/components/CartArtworkThumb";
import ClientToastHub from "@/components/ClientToastHub";
import HashToast from "@/components/HashToast";
import AddAnotherSideButton from "@/components/AddAnotherSideButton";
import CartShippingEstimator from "@/components/CartShippingEstimator";
import ChangeShippingButton from "@/components/ChangeShippingButton";
import CartCreditsRow from "@/components/CartCreditsRow";
import { getCartCreditsCents } from "@/lib/cartCredits";
import { cfImage } from "@/lib/cfImages";
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
  unit: number;
  total: number;
  artworkUrls: string[];
  optionIds: number[];
};

/* ----------------------- CF image helpers ------------------------ */
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

/* ---------------------------- Fetch cart ------------------------- */
// ✅ Next 15: headers() must be awaited
async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${proto}://${host}`;
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** Use the canonical cart API so cart + review always match */
async function loadCart() {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/cart/current`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const json = await res.json();

  const cart = json?.cart ?? null;
  const linesRaw = Array.isArray(json?.lines) ? json.lines : [];

  const lines: LineVM[] = linesRaw.map((r: any) => ({
    id: String(r.id),
    productId: Number(r.productId),
    quantity: Number(r.quantity ?? 0),
    name: r.productName || nameFallback(r.productId),
    unit: (Number(r.unitPriceCents ?? 0) || 0) / 100,
    total: (Number(r.lineTotalCents ?? 0) || 0) / 100,
    artworkUrls: (json.attachments?.[String(r.id)] || [])
      .map((a: any) => a?.url)
      .filter(Boolean),
    optionIds: Array.isArray(r.optionIds) ? r.optionIds : [],
  }));

  return {
    cart: {
      ...(cart || {}),
      selectedShipping: json?.selectedShipping ?? json?.cart?.selectedShipping ?? null,
    },
    lines,
  };
}

/* ------------------------------ Page ------------------------------ */
export default async function ReviewCartPage() {
  const data = await loadCart();

  if (!data || data.lines.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border bg-white/80 p-10 text-center shadow-sm backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
          <p className="mt-3 text-neutral-600">Your cart is empty.</p>
          <Link
            href="/"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800"
          >
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  const { cart, lines } = data;
  const currency = (cart.currency as "USD" | "CAD") ?? "USD";

  // Clerk auth() is async in Next 15
  const { userId } = await auth();
  const defaultAddr = userId ? await import("@/lib/addresses").then(m => m.getDefaultAddress(userId)) : null;
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

  // ✅ Minimal lines for SinaLite rate estimator
  const miniLines = lines.map((l) => ({
    productId: l.productId,
    optionIds: Array.isArray(l.optionIds) ? l.optionIds : [],
    quantity: l.quantity || 1,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <ClientToastHub />
      <HashToast />

      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Review your order</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Make sure everything looks perfect before checkout.
          </p>
        </div>
        <Link
          href="/cart"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          Back to cart
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT: Lines */}
        <section className="lg:col-span-8 space-y-4">
          {lines.map((line) => {
            const productImg = cartLineImageUrl(line.productId);
            const hasArtwork = (line.artworkUrls?.length ?? 0) > 0;

            return (
              <article
                key={line.id}
                className="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    {/* Product image (Cloudflare CDN) */}
                    <div className="overflow-hidden rounded-xl border">
                      <Image
                        src={productImg}
                        alt={line.name}
                        width={88}
                        height={88}
                        className="h-22 w-22 object-cover"
                        unoptimized
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold">{line.name}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          Qty {line.quantity}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-neutral-600">
                        {moneyFmt(line.unit, currency)} each
                      </div>

                      {/* Customer artwork thumbnails */}
                      {hasArtwork ? (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {line.artworkUrls!.map((u, i) => (
                            <CartArtworkThumb
                              key={`${line.id}-art-${i}`}
                              url={u}
                              alt={`Artwork side ${i + 1}`}
                            />
                          ))}
                          <AddAnotherSideButton
                            productId={line.productId}
                            lineId={line.id}
                            currentSides={line.artworkUrls!.length}
                          />
                        </div>
                      ) : (
                        <div className="mt-3">
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

                  <div className="shrink-0 text-right">
                    <div className="text-lg font-bold">{moneyFmt(line.total, currency)}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* RIGHT: Summary */}
        <aside className="lg:col-span-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="text-base font-semibold">Order summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium">{moneyFmt(subtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">
                  Shipping
                  {cart.selectedShipping?.method ? ` — ${cart.selectedShipping.method}` : " (estimated)"}
                </span>
                <span className="font-medium">{moneyFmt(shipping, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Tax</span>
                <span className="font-medium">{moneyFmt(0, currency)}</span>
              </div>

              <CartCreditsRow creditsCents={creditsCents} currency={currency} />

              <hr className="my-3" />

              <div className="flex items-center justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-extrabold">{moneyFmt(grandTotal, currency)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border bg-white p-5 shadow-sm ring-1 ring-black/5">
            {!cart.selectedShipping ? (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Shipping estimator</h3>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    Required to continue
                  </span>
                </div>
                <CartShippingEstimator
                  initialCountry={initCountry}
                  initialState={initState}
                  initialZip={initZip}
                  lines={miniLines}
                  currency={currency}
                />
              </>
            ) : (
              <div className="flex items-start justify-between gap-3">
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
            )}
          </div>

          <div className="mt-4">
            <Link
              href="/checkout"
              className={`inline-flex w-full h-11 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white shadow hover:bg-blue-800 ${
                !cart.selectedShipping ? "pointer-events-none opacity-50" : ""
              }`}
              aria-disabled={!cart.selectedShipping}
            >
              Continue to checkout
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

