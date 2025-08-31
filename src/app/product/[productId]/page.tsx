// src/app/product/[productId]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getSinaliteProductMeta,
  getSinaliteProductArrays,
  normalizeOptionGroups,
  getDefaultPriceSnapshot,
} from "@/lib/sinalite.client";
import { productImagesForProductId } from "@/lib/product-images";
import ProductBuyBox from "@/components/product/ProductBuyBox";
import ProductInfoTabs from "@/components/product/ProductInfoTabs";
import ProductReviews from "@/components/product/ProductReviews";
import ProductGallery from "@/components/product/ProductGallery";
import MobileAddToCartBar from "@/components/product/MobileAddToCartBar";

import productAssetsRaw from "@/data/productAssets.json";
import imagesAssetsRaw from "@/data/images.json";
import { cfImage } from "@/lib/cfImages";

export const dynamic = "force-dynamic";

/* ---------------------- helpers ---------------------- */
type BuyBoxOption = { id: number; name: string };
type BuyBoxOptionGroup = { name: string; options: BuyBoxOption[] };

function toBuyBoxGroups(groups: unknown): BuyBoxOptionGroup[] {
  const src = Array.isArray(groups) ? groups : [];
  const out: BuyBoxOptionGroup[] = [];

  for (const g of src) {
    const gg = g as any;

    const groupName = String(
      gg?.name ?? gg?.groupName ?? gg?.label ?? gg?.title ?? ""
    ).trim();
    if (!groupName) continue;

    const rawItems: unknown[] =
      Array.isArray(gg?.options) ? gg.options :
      Array.isArray(gg?.values)  ? gg.values  :
      Array.isArray(gg?.items)   ? gg.items   :
      Array.isArray(gg?.choices) ? gg.choices : [];

    const options = rawItems
      .map((o) => {
        const oo = o as any;
        const idCandidate =
          oo?.id ?? oo?.valueId ?? oo?.optionId ?? oo?.value ?? oo?.code ?? oo?.key;
        const idNum = Number(idCandidate);
        if (!Number.isFinite(idNum) || idNum <= 0) return null;

        const name = String(
          oo?.name ?? oo?.label ?? oo?.valueName ?? oo?.title ?? oo?.text ?? idCandidate ?? ""
        ).trim();
        if (!name) return null;

        return { id: idNum, name };
      })
      .filter(Boolean) as BuyBoxOption[];

    if (options.length === 0) continue;
    out.push({ name: groupName, options });
  }

  return out;
}

function parseCfId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    // https://imagedelivery.net/<hash>/<id>/<variant>
    return parts.length >= 3 ? parts[2] : parts[1] || null;
  } catch {
    return null;
  }
}

function titleCase(s?: string | null) {
  if (!s) return "";
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function assetNameFallback(id: number): string | null {
  const all = [...(productAssetsRaw as any[]), ...(imagesAssetsRaw as any[])];
  const a = all.find((x) => Number(x?.product_id) === id);
  return a ? titleCase(a.name || a.matched_sku) : null;
}

/* ---------------------- SEO ---------------------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId: id } = await params;
  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(id);
  } catch {}
  const idNum = Number(id);
  const name =
    meta?.name || meta?.title || assetNameFallback(idNum) || `Product ${id}`;
  const desc =
    meta?.description || `Order ${name} online — trade pricing via SinaLite.`;

  return { title: name, description: desc };
}

/* ---------------------- Page ---------------------- */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId: id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) return notFound();

  // meta
  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(id);
  } catch {
    return notFound();
  }
  if (!meta) return notFound();

  // option groups -> BuyBox format
  const { optionsArray } = await getSinaliteProductArrays(id);
  const normalized = normalizeOptionGroups(optionsArray || []);
  const optionGroups: BuyBoxOptionGroup[] = toBuyBoxGroups(normalized);

  // gallery
  const rawGallery = productImagesForProductId(id);
  const gallery = rawGallery.length
    ? rawGallery
    : [cfImage("a90ba357-76ea-48ed-1c65-44fff4401600", "productHero")];
  const productName =
    meta?.name || meta?.title || assetNameFallback(idNum) || `Product ${id}`;
  const heroCfId = parseCfId(gallery[0]);

  // starting price (best effort)
  let startingPriceDisplay: string | undefined;
  try {
    const snap = await getDefaultPriceSnapshot(idNum); // { price, currency }
    if (snap && typeof snap.price === "number") {
      startingPriceDisplay = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: snap.currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(snap.price);
    }
  } catch {
    // non-fatal
  }

  // tabs content
  const details = (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
      {meta?.description ? (
        <li className="col-span-full">{meta.description}</li>
      ) : null}
      {meta?.paperType ? (
        <li>
          <strong>Paper Type:</strong> {meta.paperType}
        </li>
      ) : null}
      {meta?.coating ? (
        <li>
          <strong>Coating:</strong> {meta.coating}
        </li>
      ) : null}
      {meta?.color ? (
        <li>
          <strong>Color:</strong> {meta.color}
        </li>
      ) : null}
      {meta?.quantities ? (
        <li>
          <strong>Quantities:</strong> {meta.quantities}
        </li>
      ) : null}
      {meta?.sizes ? (
        <li>
          <strong>Sizes:</strong> {meta.sizes}
        </li>
      ) : null}
      {meta?.finishing ? (
        <li>
          <strong>Finishing:</strong> {meta.finishing}
        </li>
      ) : null}
      {meta?.fileType ? (
        <li>
          <strong>File Type:</strong> {meta.fileType}
        </li>
      ) : null}
    </ul>
  );

  const filePrep = (
    <div className="text-sm leading-6">
      {meta?.filePrep ? (
        <div dangerouslySetInnerHTML={{ __html: meta.filePrep }} />
      ) : (
        <ul className="list-disc pl-5 space-y-1">
          <li>Use CMYK color, 300 DPI (minimum).</li>
          <li>Keep text 1/8″ inside safe margins.</li>
          <li>Include 1/8″ bleed on all sides.</li>
          <li>Accepted files: PDF (preferred), AI, PSD, TIFF.</li>
        </ul>
      )}
    </div>
  );

  const reviewsSlot = (
    <ProductReviews productId={id} productName={productName} />
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-28 md:pb-8">
      {/* breadcrumbs */}
      <nav className="mb-5 text-sm text-gray-600" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link className="hover:underline" href="/">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link className="hover:underline" href="/products">
              Products
            </Link>
          </li>
          <li>/</li>
          <li aria-current="page" className="text-gray-900 font-medium">
            {productName}
          </li>
        </ol>
      </nav>

      {/* title */}
      <header className="mb-3">
        <h1 className="text-2xl md:text-3xl font-semibold">{productName}</h1>
        {meta?.description ? (
          <p className="mt-2 max-w-2xl text-gray-600">{meta.description}</p>
        ) : null}
      </header>

      {/* content */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,720px)_minmax(0,460px)]">
        {/* LEFT */}
        <div>
          <ProductGallery images={gallery} productName={productName} />
          <ProductInfoTabs
            details={details}
            filePrep={filePrep}
            reviewsSlot={reviewsSlot}
          />
        </div>

        {/* RIGHT: Buy Box */}
        <aside className="lg:sticky lg:top-24 h-fit" id="buy-box">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Price this item</h3>
            <div className="mb-4 flex items-center gap-3 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1">
                ✅ <span>Trade-only pricing</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                🚚 <span>Fast turnaround</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                🇺🇸 <span>Prints in USA</span>
              </span>
            </div>

            <ProductBuyBox
              productId={idNum}
              productName={productName}
              optionGroups={optionGroups}   
              store={"US"}
              cloudflareImageId={heroCfId || undefined}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-gray-600">
            <div className="rounded-lg border p-3">🔒 Secure Checkout</div>
            <div className="rounded-lg border p-3">📦 Real-time Tracking</div>
            <div className="rounded-lg border p-3">💬 Live Support</div>
          </div>
        </aside>
      </section>

      {/* mobile sticky add-to-cart */}
      <MobileAddToCartBar
        productName={productName}
        startingPrice={startingPriceDisplay}
        targetId="buy-box"
      />
    </main>
  );
}
