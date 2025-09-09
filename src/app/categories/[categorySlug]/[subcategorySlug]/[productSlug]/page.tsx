// src/app/category/[categorySlug]/[subcategorySlug]/[productSlug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getSinaliteProductMeta,
  getSinaliteProductArrays,
  normalizeOptionGroups,
  getDefaultPriceSnapshot,
} from "@/lib/sinalite.client"; // Per SinaLite API docs; ensure this file is SERVER-safe (no "use client")

import ProductBuyBox from "@/components/product/ProductBuyBox";
import ProductInfoTabs from "@/components/product/ProductInfoTabs";
import ProductReviews from "@/components/product/ProductReviews";
import ProductGallery from "@/components/product/ProductGallery";
import MobileAddToCartBar from "@/components/product/MobileAddToCartBar";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";
import { cfImage, type Variant as CfVariant } from "@/lib/cfImages";

/* ---------------- types shaped to your JSON ---------------- */
type Category = { id?: number | string | null; slug: string; name?: string | null };
type Subcategory = {
  id?: number | string | null;
  subcategory_id?: number | string | null;
  category_id?: number | string | null;
  category_slug?: string | null;
  slug?: string | null;
  name: string;
  cf_image_id?: string | null;
};
type ProductRow = {
  id?: number | string | null;
  sinalite_id?: number | string | null;
  category_id?: number | string | null;
  category_slug?: string | null;
  subcategory_id?: number | string | null;
  subcategory_slug?: string | null; // lives on PRODUCT rows
  sku?: string | null;
  name?: string | null;
  slug?: string | null;
  product_slug?: string | null;
  ["slugs (products)"]?: string | null;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  [k: string]: any;
};

/* ---------------- utils ---------------- */
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://adapnow.com";
const V = (v: string) => v as unknown as CfVariant;

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
function titleCase(s?: string | null) {
  if (!s) return "";
  return s.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
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

/* ---------------- BuyBox mapping ---------------- */
type BuyBoxOption = { id: number; name: string };
type BuyBoxOptionGroup = { name: string; options: BuyBoxOption[] };

function toBuyBoxGroups(groups: any[]): BuyBoxOptionGroup[] {
  const src = Array.isArray(groups) ? groups : [];
  const out: BuyBoxOptionGroup[] = [];

  for (const g of src) {
    const groupName = String(g?.name ?? g?.groupName ?? g?.label ?? g?.title ?? "").trim();
    if (!groupName) continue;

    const rawItems: unknown[] =
      Array.isArray(g?.options) ? g.options :
      Array.isArray(g?.values)  ? g.values  :
      Array.isArray(g?.items)   ? g.items   :
      Array.isArray(g?.choices) ? g.choices : [];

    const options = rawItems
      .map((o: any) => {
        const idCandidate = o?.id ?? o?.valueId ?? o?.optionId ?? o?.value ?? o?.code ?? o?.key;
        const idNum = Number(idCandidate);
        if (!Number.isFinite(idNum) || idNum <= 0) return null;

        const name = String(o?.name ?? o?.label ?? o?.valueName ?? o?.title ?? o?.text ?? idCandidate ?? "").trim();
        if (!name) return null;

        return { id: idNum, name };
      })
      .filter(Boolean) as BuyBoxOption[];

    if (options.length === 0) continue;
    out.push({ name: groupName, options });
  }

  return out;
}

/* --------- SEO with resolved product name when possible --------- */
export async function generateMetadata({
  params,
}: {
  params: { categorySlug: string; subcategorySlug: string; productSlug: string };
}): Promise<Metadata> {
  const { categorySlug, subcategorySlug, productSlug } = params;

  const cats = categoryAssets as Category[];
  const subs = subcategoryAssets as Subcategory[];
  const prods = productAssets as ProductRow[];

  const cat = cats.find((c) => c.slug === categorySlug);
  if (!cat) return { title: "Product Not Found" };

  // scope sub to category (slug or id)
  const subPool = subs.filter(
    (s) =>
      (s.category_slug || "").trim() === cat.slug ||
      (toNum(s.category_id) !== null && toNum(s.category_id) === toNum(cat.id))
  );
  const sub =
    subPool.find((s) => ensureSubSlug(s) === subcategorySlug) ||
    subPool.find((s) => toSlug(s.name) === subcategorySlug);
  if (!sub) return { title: "Product Not Found" };

  // scope products to category (+ sub if available)
  const prodPool = prods.filter(
    (p) =>
      (p.category_slug || "").trim() === cat.slug ||
      (toNum(p.category_id) !== null && toNum(p.category_id) === toNum(cat.id))
  );
  const subId = pickSubId(sub);
  const prodScoped =
    subId != null
      ? prodPool.filter(
          (p) =>
            toNum(p.subcategory_id) === subId ||
            (p.subcategory_slug || "") === ensureSubSlug(sub)
        )
      : prodPool;

  const row =
    prodScoped.find((p) => productSlugFromRow(p) === productSlug) ||
    prodPool.find((p) => productSlugFromRow(p) === productSlug);
  if (!row) return { title: "Product Not Found" };

  const idStr = row.sinalite_id != null ? String(row.sinalite_id) : row.id != null ? String(row.id) : null;

  let metaTitle = titleCase(row.name || productSlug);
  let metaDesc = `Order ${metaTitle} online — live specs & pricing via SinaLite; images delivered fast via Cloudflare CDN.`;
  try {
    if (idStr) {
      const m = await getSinaliteProductMeta(idStr);
      if (m?.name) metaTitle = m.name;
      if (m?.description) metaDesc = m.description;
    }
  } catch {
    // keep defaults
  }

  const firstImg = allImageIds(row)[0];
  const ogImg = firstImg ? cfImage(firstImg, V("productHero")) : undefined;

  return {
    title: `${metaTitle} | American Design And Printing`,
    description: metaDesc,
    alternates: { canonical: `/category/${categorySlug}/${subcategorySlug}/${productSlug}` },
    openGraph: {
      title: metaTitle,
      description: metaDesc,
      url: `${SITE}/category/${categorySlug}/${subcategorySlug}/${productSlug}`,
      images: ogImg ? [{ url: ogImg, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDesc,
      images: ogImg ? [ogImg] : undefined,
    },
  };
}

/* ---------------------- Page ---------------------- */
export default async function ProductPage({
  params,
}: {
  params: { categorySlug: string; subcategorySlug: string; productSlug: string };
}) {
  const { categorySlug, subcategorySlug, productSlug } = params;

  const cats = categoryAssets as Category[];
  const subs = subcategoryAssets as Subcategory[];
  const prods = productAssets as ProductRow[];

  const cat = cats.find((c) => c.slug === categorySlug);
  if (!cat) return notFound();

  // scope sub to category
  const subPool = subs.filter(
    (s) =>
      (s.category_slug || "").trim() === cat.slug ||
      (toNum(s.category_id) !== null && toNum(s.category_id) === toNum(cat.id))
  );
  const sub =
    subPool.find((s) => ensureSubSlug(s) === subcategorySlug) ||
    subPool.find((s) => toSlug(s.name) === subcategorySlug);
  if (!sub) return notFound();
  const subId = pickSubId(sub);

  // scope products to category (+ sub if available)
  const prodPool = prods.filter(
    (p) =>
      (p.category_slug || "").trim() === cat.slug ||
      (toNum(p.category_id) !== null && toNum(p.category_id) === toNum(cat.id))
  );
  const prodScoped =
    subId != null
      ? prodPool.filter(
          (p) =>
            toNum(p.subcategory_id) === subId ||
            (p.subcategory_slug || "") === ensureSubSlug(sub)
        )
      : prodPool;

  const prodRow =
    prodScoped.find((p) => productSlugFromRow(p) === productSlug) ||
    prodPool.find((p) => productSlugFromRow(p) === productSlug);

  if (!prodRow) return notFound();

  /* ---------- Sinalite product id (ONE place) ---------- */
  const sinaliteIdStr =
    prodRow.sinalite_id != null ? String(prodRow.sinalite_id) :
    prodRow.id != null         ? String(prodRow.id) : null;

  if (!sinaliteIdStr) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[PDP] Missing Sinalite id", { productSlug, prodRow });
    }
    return notFound();
  }

  const sinaliteIdNum = Number(sinaliteIdStr);
  if (!Number.isFinite(sinaliteIdNum) || sinaliteIdNum <= 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[PDP] Invalid Sinalite id", { sinaliteIdStr });
    }
    return notFound();
  }

  /* ---------- Live meta + options via SinaLite (per docs) ---------- */
  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(sinaliteIdStr);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[PDP] getSinaliteProductMeta failed:", e);
    }
  }

  const arrays = await getSinaliteProductArrays(sinaliteIdStr).catch((e) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[PDP] getSinaliteProductArrays failed:", e);
    }
    return null;
  });

  const optionsArray: any[] = (arrays?.optionsArray ?? []) as any[];
  const normalized: any[] = Array.isArray(optionsArray) ? (normalizeOptionGroups(optionsArray) as any[]) : [];
  const buyBoxGroups: BuyBoxOptionGroup[] = toBuyBoxGroups(normalized);

  /* ---------- Cloudflare gallery via productAssets ---------- */
  const ids = allImageIds(prodRow);
  const gallery: string[] =
    ids.length > 0
      ? ids.map((id, i) => cfImage(id, V(i === 0 ? "productHero" : "productCard")) || "")
      : [cfImage("a90ba357-76ea-48ed-1c65-44fff4401600", V("productHero"))!]; // safe fallback

  const productName =
    meta?.name || (prodRow.name ? String(prodRow.name) : titleCase(productSlug));
  const heroCfId = ids[0] || null;

  /* ---------- Price snapshot (best effort) ---------- */
  let startingPriceDisplay: string | undefined;
  try {
    const snap = await getDefaultPriceSnapshot(sinaliteIdNum); // { price, currency }
    if (snap && typeof (snap as any).price === "number") {
      startingPriceDisplay = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (snap as any).currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format((snap as any).price);
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[PDP] getDefaultPriceSnapshot failed:", e);
    }
  }

  /* ---------- Tabs ---------- */
  const details = (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
      {meta?.description ? <li className="col-span-full">{meta.description}</li> : null}
      {meta?.paperType ? <li><strong>Paper Type:</strong> {meta.paperType}</li> : null}
      {meta?.coating ? <li><strong>Coating:</strong> {meta.coating}</li> : null}
      {meta?.color ? <li><strong>Color:</strong> {meta.color}</li> : null}
      {meta?.quantities ? <li><strong>Quantities:</strong> {meta.quantities}</li> : null}
      {meta?.sizes ? <li><strong>Sizes:</strong> {meta.sizes}</li> : null}
      {meta?.finishing ? <li><strong>Finishing:</strong> {meta.finishing}</li> : null}
      {meta?.fileType ? <li><strong>File Type:</strong> {meta.fileType}</li> : null}
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
      {/* breadcrumbs aligned to /category path */}
      <nav className="mb-5 text-sm text-gray-600" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link className="hover:underline" href="/">Home</Link></li>
          <li>/</li>
          <li><Link className="hover:underline" href={`/category/${categorySlug}`}>{titleCase(categorySlug)}</Link></li>
          <li>/</li>
          <li><Link className="hover:underline" href={`/category/${categorySlug}/${subcategorySlug}`}>{titleCase(subcategorySlug)}</Link></li>
          <li>/</li>
          <li aria-current="page" className="text-gray-900 font-medium">{productName}</li>
        </ol>
      </nav>

      <header className="mb-3">
        <h1 className="text-2xl md:text-3xl font-semibold">{productName}</h1>
        {meta?.description ? <p className="mt-2 max-w-2xl text-gray-600">{meta.description}</p> : null}
      </header>

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
              optionGroups={buyBoxGroups}
              store="US"
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

      <MobileAddToCartBar productName={productName} startingPrice={startingPriceDisplay} targetId="buy-box" />
    </main>
  );
}
