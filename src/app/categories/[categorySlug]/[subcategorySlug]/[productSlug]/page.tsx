// src/app/category/[categorySlug]/[subcategorySlug]/[productSlug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getSinaliteProductMeta,
  getSinaliteProductArrays,
  normalizeOptionGroups,
  getDefaultPriceSnapshot,
} from "@/lib/sinalite.client"; // ✅ keep using your existing SinaLite helpers (per SinaLite API docs)

import ProductBuyBox from "@/components/product/ProductBuyBox";
import ProductInfoTabs from "@/components/product/ProductInfoTabs";
import ProductReviews from "@/components/product/ProductReviews";
import ProductGallery from "@/components/product/ProductGallery";
import MobileAddToCartBar from "@/components/product/MobileAddToCartBar";

import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";
import { cfImage } from "@/lib/cfImages"; // Cloudflare Images → CDN URLs

/* ---------------------- types (loose to match JSON) ---------------------- */
type Subcategory = {
  id?: number | string | null;
  subcategory_id?: number | string | null;
  slug?: string | null;
  name: string;
};

type ProductRow = {
  id?: number | string | null;          // local numeric id (often equals Sinalite product id)
  sinalite_id?: number | string | null; // preferred for API calls
  subcategory_id?: number | string | null;
  sku?: string | null;
  name?: string | null;
  slug?: string | null;
  ["slugs (products)"]?: string | null;
  product_slug?: string | null;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  [k: string]: any;
};

/* ---------------------- tiny utils ---------------------- */
function toNum(n: unknown): number | null {
  const s = n == null ? "" : String(n).trim();
  if (!s) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
function toSlug(s?: string | null): string {
  if (!s) return "";
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function pickSubId(s: Subcategory): number | null {
  for (const k of ["id", "subcategory_id"] as const) {
    const n = toNum((s as any)[k]);
    if (n !== null) return n;
  }
  return null;
}
function ensureSubSlug(s: Subcategory): string {
  return (s.slug && s.slug.trim()) || toSlug(s.name) || (pickSubId(s) ? `sub-${pickSubId(s)}` : "sub");
}
function productSlugFromRow(p: ProductRow): string {
  const cands = [
    p.slug,
    p.product_slug,
    p["slugs (products)"],
    p.name ? toSlug(p.name) : "",
    p.sku ? toSlug(p.sku) : "",
  ].map((x) => (x ?? "").toString().trim());
  return cands.find(Boolean) || "";
}
function allImageIds(p: ProductRow): string[] {
  const ids = [
    p.cf_image_1_id?.trim(),
    p.cf_image_2_id?.trim(),
    p.cf_image_3_id?.trim(),
    p.cf_image_4_id?.trim(),
  ].filter((x): x is string => !!x);
  return Array.from(new Set(ids));
}
function titleCase(s?: string | null) {
  if (!s) return "";
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
/** Extract Cloudflare image ID from a full imagedelivery URL if needed */
function parseCfId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length >= 3 ? parts[2] : parts[1] || null;
  } catch {
    return null;
  }
}

/* ---------------------- BuyBox mapping ---------------------- */
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

/* ---------------------- SEO (optional) ---------------------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; subcategorySlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { productSlug } = await params;

  // We don’t have the id here yet, so render a generic title; the page will
  // render the precise title once we resolve the product from assets + SinaLite.
  return {
    title: titleCase(productSlug),
    description: `Order ${titleCase(productSlug)} online — live specs & pricing via SinaLite; images via Cloudflare CDN.`,
  };
}

/* ---------------------- Page ---------------------- */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ categorySlug: string; subcategorySlug: string; productSlug: string }>;
}) {
  const { categorySlug, subcategorySlug, productSlug } = await params;

  const subs = subcategoryAssets as unknown as Subcategory[];
  const prods = productAssets as unknown as ProductRow[];

  // Ensure subcategory exists from route (tolerant)
  const sub =
    subs.find((s) => ensureSubSlug(s) === subcategorySlug) ||
    subs.find((s) => toSlug(s.name) === subcategorySlug);
  if (!sub) return notFound();

  const subId = pickSubId(sub);

  // Find product row by slug (scoped to subcategory if possible)
  let prodRow =
    prods.find(
      (p) => productSlugFromRow(p) === productSlug && (subId === null || toNum(p.subcategory_id) === subId)
    ) || prods.find((p) => productSlugFromRow(p) === productSlug);

  if (!prodRow) return notFound();

  // Sinalite product id (preferred: sinalite_id, else id)
  const sinaliteIdStr =
    prodRow.sinalite_id != null ? String(prodRow.sinalite_id) :
    prodRow.id != null         ? String(prodRow.id) : null;

  const sinaliteIdNum = sinaliteIdStr ? Number(sinaliteIdStr) : NaN;
  if (!sinaliteIdStr || !Number.isFinite(sinaliteIdNum) || sinaliteIdNum <= 0) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[ProductPage] Missing/invalid Sinalite product id for route", { productSlug, prodRow });
    }
    return notFound();
  }

  // --- Fetch live data from SinaLite (per docs) ---
  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(sinaliteIdStr);
  } catch {
    // still render with local name/images; buy box may fail without meta
  }

  const { optionsArray } = (await getSinaliteProductArrays(sinaliteIdStr).catch(() => ({ optionsArray: [] }))) as any;
  const normalized = normalizeOptionGroups(optionsArray || []);
  const optionGroups: BuyBoxOptionGroup[] = toBuyBoxGroups(normalized);

  // --- Build gallery from Cloudflare image IDs in productAssets.json ---
  const ids = allImageIds(prodRow);
  const gallery: string[] =
    ids.length > 0 ? ids.map((id, i) => cfImage(id, i === 0 ? "productHero" : "productCard") || "")
                   : [cfImage("a90ba357-76ea-48ed-1c65-44fff4401600", "productHero")!]; // placeholder

  const productName =
    meta?.name || meta?.title || (prodRow.name ? String(prodRow.name) : titleCase(productSlug));
  const heroCfId = ids[0] ?? parseCfId(gallery[0]);

  // --- Best-effort starting price ---
  let startingPriceDisplay: string | undefined;
  try {
    const snap = await getDefaultPriceSnapshot(sinaliteIdNum); // { price, currency }
    if (snap && typeof snap.price === "number") {
      startingPriceDisplay = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (snap as any).currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(snap.price);
    }
  } catch { /* non-fatal */ }

  // --- Tabs content (driven by SinaLite meta when available) ---
  const details = (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
      {meta?.description ? (
        <li className="col-span-full">{meta.description}</li>
      ) : null}
      {meta?.paperType ? (
        <li><strong>Paper Type:</strong> {meta.paperType}</li>
      ) : null}
      {meta?.coating ? (
        <li><strong>Coating:</strong> {meta.coating}</li>
      ) : null}
      {meta?.color ? (
        <li><strong>Color:</strong> {meta.color}</li>
      ) : null}
      {meta?.quantities ? (
        <li><strong>Quantities:</strong> {meta.quantities}</li>
      ) : null}
      {meta?.sizes ? (
        <li><strong>Sizes:</strong> {meta.sizes}</li>
      ) : null}
      {meta?.finishing ? (
        <li><strong>Finishing:</strong> {meta.finishing}</li>
      ) : null}
      {meta?.fileType ? (
        <li><strong>File Type:</strong> {meta.fileType}</li>
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

  const reviewsSlot = <ProductReviews productId={sinaliteIdStr} productName={productName} />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-28 md:pb-8">
      {/* breadcrumbs aligned to route */}
      <nav className="mb-5 text-sm text-gray-600" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link className="hover:underline" href="/">Home</Link></li>
          <li>/</li>
          <li>
            <Link className="hover:underline" href={`/category/${categorySlug}`}>
              {titleCase(categorySlug)}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              className="hover:underline"
              href={`/category/${categorySlug}/${subcategorySlug}`}
            >
              {titleCase(subcategorySlug)}
            </Link>
          </li>
          <li>/</li>
          <li aria-current="page" className="text-gray-900 font-medium">{productName}</li>
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
          <ProductInfoTabs details={details} filePrep={filePrep} reviewsSlot={reviewsSlot} />
        </div>

        {/* RIGHT: Buy Box (SinaLite options + Cloudflare hero) */}
        <aside className="lg:sticky lg:top-24 h-fit" id="buy-box">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Price this item</h3>
            <div className="mb-4 flex items-center gap-3 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1">✅ <span>Trade-only pricing</span></span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">🚚 <span>Fast turnaround</span></span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">🇺🇸 <span>Prints in USA</span></span>
            </div>

            <ProductBuyBox
              productId={sinaliteIdNum}
              productName={productName}
              optionGroups={optionGroups}
              store={"US"}
              cloudflareImageId={heroCfId || undefined} // ✅ pass CF image ID (not URL) to BuyBox
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
