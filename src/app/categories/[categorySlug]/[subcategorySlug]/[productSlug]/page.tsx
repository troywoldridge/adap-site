// src/app/categories/[categorySlug]/[subcategorySlug]/[productSlug]/page.tsx
import "server-only";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getSinaliteProductMeta,
  getSinaliteProductArrays,
  normalizeOptionGroups,
  getDefaultPriceSnapshot,
} from "@/lib/sinalite.client";

import ProductBuyBox from "@/components/product/ProductBuyBox";
import ProductInfoTabs from "@/components/product/ProductInfoTabs";
import ProductReviews from "@/components/product/ProductReviews";
import ProductGallery from "@/components/product/ProductGallery";
import MobileAddToCartBar from "@/components/product/MobileAddToCartBar";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";
import { cfImage, type Variant as CfVariant } from "@/lib/cfImages";

/* ---------------- Types ---------------- */
type Category = { id?: number | string | null; slug: string; name?: string | null };
type Subcategory = {
  id?: number | string | null;
  subcategory_id?: number | string | null;
  category_id?: number | string | null;
  category_slug?: string | null;
  slug?: string | null;
  name: string;
  description?: string | null;
  cf_image_id?: string | null;
  sort_order?: number | string | null;
};
type ProductRow = {
  id?: number | string | null;
  sinalite_id?: number | string | null;
  category_id?: number | string | null;
  category_slug?: string | null;
  subcategory_id?: number | string | null;
  subcategory_slug?: string | null;
  sku?: string | null;
  name?: string | null;
  slug?: string | null;
  product_slug?: string | null;
  ["slugs (products)"]?: string | null;
  description?: string | null;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  [k: string]: any;
};

/* ---------------- Utils ---------------- */
const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://adapnow.com";
const V = (v: string) => v as unknown as CfVariant;

const toNum = (n: unknown): number | null => {
  const s = n == null ? "" : String(n).trim();
  if (!s) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
};
const toSlug = (s?: string | null) =>
  (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const titleCase = (s?: string | null) =>
  (s || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());

/** Prefer productAssets JSON slugs first; fall back to name/sku slugified */
function productSlugFromRow(p: ProductRow): string {
  const cands = [p.slug, p.product_slug, p["slugs (products)"], p.name ? toSlug(p.name) : "", p.sku ? toSlug(p.sku) : ""]
    .map((x) => (x ?? "").toString().trim());
  return cands.find(Boolean) || "";
}

/** CF gallery ids from productAssets.json (no SinaLite needed) */
function allImageIds(p: ProductRow): string[] {
  return [p.cf_image_1_id, p.cf_image_2_id, p.cf_image_3_id, p.cf_image_4_id]
    .map((x) => (x ?? "").trim())
    .filter(Boolean) as string[];
}

function ensureSubSlug(s: Subcategory): string {
  const id = toNum(s.subcategory_id) ?? toNum(s.id);
  return (s.slug && s.slug.trim()) || toSlug(s.name) || (id ? `sub-${id}` : "subcategory");
}

/** Friendly sub label for pages like /sub-30 when assets don’t name it */
function deriveFriendlySubLabel(products: ProductRow[], categorySlug: string, fallback: string): string {
  const counts = new Map<string, number>();
  for (const p of products) {
    const sc = (p.subcategory_slug || "").trim();
    let label = sc
      ? titleCase(sc)
      : (() => {
          const base = (p.slug || p.product_slug || p.name || "").toString().toLowerCase();
          const pref = `${categorySlug}-`;
          const rest = base.startsWith(pref) ? base.slice(pref.length) : base;
          const parts = rest.split(/[-\s]+/).filter(Boolean);
          return titleCase(parts.slice(0, Math.min(3, parts.length)).join(" ") || fallback);
        })();
    label = label || fallback;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  if (counts.size === 0) return titleCase(fallback);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

/* -------- Robust slug matchers (use productAssets as the source of truth) -------- */
function slugCandidatesForRow(p: ProductRow): string[] {
  const candRaw = [p.slug, p.product_slug, (p as any)["slugs (products)"], p.name ? toSlug(p.name) : "", p.sku ? toSlug(p.sku) : ""]
    .map((x) => (x ?? "").toString().trim());

  const set = new Set<string>();
  for (const c of candRaw) {
    const s = c.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (s) set.add(s);
  }
  return Array.from(set);
}

function findProductByAnySlug(all: ProductRow[], productSlug: string): ProductRow | null {
  const target = toSlug(productSlug);
  const direct = all.find((p) => slugCandidatesForRow(p).includes(target));
  if (direct) return direct;

  const loose = all.find((p) => {
    const cands = slugCandidatesForRow(p);
    return cands.some((c) => c === target || c.replace(/-+/g, "") === target.replace(/-+/g, ""));
  });
  return loose ?? null;
}

/* ---------------- SEO ---------------- */
export async function generateMetadata(
  { params }: { params: Promise<{ categorySlug: string; subcategorySlug: string; productSlug: string }> }
): Promise<Metadata> {
  const { categorySlug, subcategorySlug, productSlug } = await params;

  const cats = categoryAssets as Category[];
  const subs = subcategoryAssets as Subcategory[];
  const prods = productAssets as ProductRow[];

  const product = findProductByAnySlug(prods, productSlug);
  if (!product) return { title: "Product Not Found" };

  const cat =
    cats.find((c) => c.slug === (product.category_slug || "").trim()) ||
    cats.find((c) => c.slug === categorySlug);
  const readableCat = titleCase(cat?.name ?? categorySlug);

  const sub =
    subs.find((s) => ensureSubSlug(s) === (product.subcategory_slug || "").trim()) ||
    subs.find((s) =>
      ((s.category_slug || "").trim() === (product.category_slug || "").trim()) &&
      (toNum(s.subcategory_id) === toNum(product.subcategory_id) || toNum(s.id) === toNum(product.subcategory_id))
    );
  const fallbackSubLabel = subcategorySlug.startsWith("sub-") ? `Sub ${subcategorySlug.slice(4)}` : subcategorySlug;

  const inThisCat = prods.filter(
    (p) =>
      (p.category_slug || "").trim() === (product.category_slug || "").trim() ||
      (toNum(p.category_id) ?? NaN) === (toNum(product.category_id) ?? NaN)
  );
  const friendlySub = titleCase(sub?.name ?? deriveFriendlySubLabel(inThisCat, categorySlug, fallbackSubLabel));

  // Meta (enrich from SinaLite if available)
  const idStr = product.sinalite_id != null ? String(product.sinalite_id) : product.id != null ? String(product.id) : null;
  let metaTitle = titleCase(product.name || productSlug.replace(/[-_]+/g, " "));
  let metaDesc = product.description || `Configure ${metaTitle}. Live pricing via SinaLite; images via Cloudflare CDN.`;
  try {
    if (idStr) {
      const m = await getSinaliteProductMeta(idStr);
      if (m?.name) metaTitle = m.name;
      if (m?.description) metaDesc = m.description;
    }
  } catch {}

  const firstImg = allImageIds(product)[0];
  const ogImg = firstImg ? cfImage(firstImg, V("productHero")) : undefined;

  return {
    title: `${metaTitle} • ${friendlySub} | American Design And Printing`,
    description: metaDesc,
    alternates: { canonical: `/categories/${categorySlug}/${subcategorySlug}/${productSlug}` },
    openGraph: {
      type: "website",
      title: metaTitle,
      description: metaDesc,
      url: `${SITE}/categories/${categorySlug}/${subcategorySlug}/${productSlug}`,
      images: ogImg ? [{ url: ogImg, width: 1200, height: 630 }] : undefined,
    },
    twitter: { card: "summary_large_image", title: metaTitle, description: metaDesc, images: ogImg ? [ogImg] : undefined },
    robots: { index: true, follow: true },
  };
}

/* ---------------- PAGE ---------------- */
export default async function ProductPage(
  { params }: { params: Promise<{ categorySlug: string; subcategorySlug: string; productSlug: string }> }
) {
  const { categorySlug, subcategorySlug, productSlug } = await params;

  const cats = categoryAssets as Category[];
  const subs = subcategoryAssets as Subcategory[];
  const prods = productAssets as ProductRow[];

  const prodRow = findProductByAnySlug(prods, productSlug);
  if (!prodRow) return notFound();

  // Friendly labels
  const cat =
    cats.find((c) => c.slug === (prodRow.category_slug || "").trim()) ||
    cats.find((c) => c.slug === categorySlug);
  const readableCat = titleCase(cat?.name ?? categorySlug);

  const sub =
    subs.find((s) => ensureSubSlug(s) === (prodRow.subcategory_slug || "").trim()) ||
    subs.find((s) =>
      ((s.category_slug || "").trim() === (prodRow.category_slug || "").trim()) &&
      (toNum(s.subcategory_id) === toNum(prodRow.subcategory_id) || toNum(s.id) === toNum(prodRow.subcategory_id))
    );

  const fallbackSubLabel = subcategorySlug.startsWith("sub-") ? `Sub ${subcategorySlug.slice(4)}` : subcategorySlug;
  const inThisCat = prods.filter(
    (p) =>
      (p.category_slug || "").trim() === (prodRow.category_slug || "").trim() ||
      (toNum(p.category_id) ?? NaN) === (toNum(prodRow.category_id) ?? NaN)
  );
  const friendlySub = titleCase(sub?.name ?? deriveFriendlySubLabel(inThisCat, categorySlug, fallbackSubLabel));

  // Gallery via Cloudflare CDN
  const ids = allImageIds(prodRow);
  const gallery: string[] =
    ids.length > 0
      ? ids.map((id, i) => cfImage(id, V(i === 0 ? "productHero" : "productCard")) || "")
      : [cfImage("a90ba357-76ea-48ed-1c65-44fff4401600", V("productHero"))!];

  const productName = prodRow.name ? String(prodRow.name) : titleCase(productSlug.replace(/[-_]+/g, " "));
  const heroCfId = ids[0] || undefined;

  // SinaLite ID (for live options & pricing)
  const sinaliteIdStr =
    prodRow.sinalite_id != null ? String(prodRow.sinalite_id) :
    prodRow.id != null         ? String(prodRow.id) : null;
  if (!sinaliteIdStr) return notFound();
  const sinaliteIdNum = Number(sinaliteIdStr);
  if (!Number.isFinite(sinaliteIdNum) || sinaliteIdNum <= 0) return notFound();

  // Options + arrays (per SinaLite API docs)
  const arrays = await getSinaliteProductArrays(sinaliteIdStr).catch(() => null);
  const optionsArray: any[] = (arrays?.optionsArray ?? []) as any[];
  const normalized: any[] = Array.isArray(optionsArray) ? (normalizeOptionGroups(optionsArray) as any[]) : [];

// === buyBoxGroups with NUMERIC IDs + normalized group names (SinaLite-ready) ===
const buyBoxGroups = (() => {
  const out: { name: string; options: { id: number; name: string }[] }[] = [];

  for (const g of normalized) {
    const rawName = String(g?.name ?? g?.groupName ?? g?.label ?? g?.title ?? "").trim();
    if (!rawName) continue;

    // Normalize so the Buy Box can find the Quantity group reliably
    const lname = rawName.toLowerCase();
    const gName = lname.includes("qty") || lname.includes("quantity") ? "Quantity" : rawName;

    const raw =
      Array.isArray(g?.options) ? g.options :
      Array.isArray(g?.values)  ? g.values  :
      Array.isArray(g?.items)   ? g.items   : [];

    const options = raw
      .map((o: any) => {
        // Per SinaLite API docs, these are numeric IDs (valueId/optionId most commonly)
        const idNum = Number(o?.valueId ?? o?.optionId ?? o?.id ?? o?.value ?? o?.code);
        const label = String(o?.name ?? o?.label ?? o?.valueName ?? o?.title ?? idNum).trim();
        return Number.isFinite(idNum) && idNum > 0 ? { id: idNum, name: label } : null;
      })
      .filter(Boolean) as { id: number; name: string }[];

    if (options.length) out.push({ name: gName, options });
  }

  return out;
})();

  /* === Meta for Details/File Prep === */
  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(sinaliteIdStr);
  } catch {}

  // Helper to pull option names for “Sizes/Quantities” when meta is missing
  const extractGroupOptions = (groups: BBGroup[], key: string): string[] => {
    const hit = groups.find((g) => g.name.toLowerCase().includes(key));
    return hit?.options?.map((o) => o.name) ?? [];
  };
  const sizeNames = extractGroupOptions(buyBoxGroups, "size");
  const qtyNames = extractGroupOptions(buyBoxGroups, "quantity");

  /* --- Details panel --- */
  const detailsPanel = (
    <div className="not-prose">
      {(meta?.description || prodRow.description) ? (
        <p className="text-sm text-gray-700 max-w-3xl">{meta?.description ?? prodRow.description}</p>
      ) : null}

      <dl className="mt-4 grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="font-medium text-gray-900">Paper Type</dt>
          <dd className="text-gray-700">{meta?.paperType ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-900">Coating</dt>
          <dd className="text-gray-700">{meta?.coating ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-900">Color</dt>
          <dd className="text-gray-700">{meta?.color ?? "Full color CMYK"}</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <dt className="font-medium text-gray-900">Quantities</dt>
          <dd className="text-gray-700">
            {meta?.quantities || (qtyNames.length ? `Ranges from ${qtyNames[0]} to ${qtyNames.at(-1)}` : "See options")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-gray-900">Sizes</dt>
          <dd className="text-gray-700">
            {Array.isArray(meta?.sizes) ? meta.sizes.join(" • ")
              : meta?.sizes ?? (sizeNames.length ? sizeNames.join(" • ") : "See options")}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-gray-900">Finishing</dt>
          <dd className="text-gray-700">{meta?.finishing ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-900">File Type</dt>
          <dd className="text-gray-700">{meta?.fileType ?? "Print Ready PDF"}</dd>
        </div>
      </dl>
    </div>
  );

  /* --- File Prep panel (accordion style) --- */
  const filePrepPanel = meta?.filePrep ? (
    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: meta.filePrep }} />
  ) : (
    <div className="space-y-4">
      {/* Download Setup Guide */}
      <div className="rounded-md border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
          <div>
            <h3 className="font-semibold">Download Setup Guide</h3>
            <p className="text-sm text-gray-600">How to set up multi-page files properly</p>
          </div>
          <Link
            href="/guides"
            className="inline-flex items-center rounded-md border px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Get It Now
          </Link>
        </div>
      </div>

      {/* File Orientation Guide */}
      <details className="rounded-md border overflow-hidden group">
        <summary className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100">
          <div>
            <h3 className="font-semibold">File Orientation Guide</h3>
            <p className="text-sm text-gray-600">How to set up proper orientation for your files</p>
          </div>
          <span className="text-blue-700 text-sm">Learn More</span>
        </summary>
        <div className="px-4 py-5">
          <p className="text-sm text-gray-700 max-w-3xl">
            File Orientation refers to the orientation of the artwork files submitted. Ensure that they
            are submitted to back up properly to produce the intended result.
          </p>

          <h4 className="mt-5 text-lg font-semibold">Flat Artwork (Postcards, Flyers etc.)</h4>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="text-red-600 font-semibold mb-2">Proper Page Orientation</div>
              <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
                <li>Both pages upright — “TOP” at the top on Page 1 and Page 2.</li>
                <li>Do not rotate the back page 180°; keep pages aligned.</li>
                <li>Maintain consistent orientation across multi-page files.</li>
              </ul>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-red-600 font-semibold mb-2">Incorrect Page Orientation</div>
              <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
                <li>One page rotated 90° or 180° relative to the other.</li>
                <li>“TOP” not aligned between Page 1 and Page 2.</li>
                <li>Mixed orientations in the same document.</li>
              </ul>
            </div>
          </div>
        </div>
      </details>

      {/* How To Set Up Your Files */}
      <details className="rounded-md border overflow-hidden group">
        <summary className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100">
          <div>
            <h3 className="font-semibold">How To Set Up Your Files</h3>
            <p className="text-sm text-gray-600">Learn how to set up your files the right way</p>
          </div>
          <span className="text-blue-700 text-sm">Learn More</span>
        </summary>
        <div className="px-4 py-5">
          <h4 className="text-base font-semibold">General File Preparation Guidelines</h4>
          <ol className="mt-3 list-decimal pl-5 space-y-1 text-sm text-gray-700 max-w-3xl">
            <li>Download our guides to ensure a more optimal print result.</li>
            <li>Delete hidden/non-printing layers (guides, hidden artwork).</li>
            <li>Submit a single multi-page PDF; all pages the same size.</li>
            <li>Use the proper orientation (see File Orientation Guide above).</li>
            <li>Avoid borders; small trim variance can make them look off-center.</li>
            <li>Include 1/8″ bleed and keep text in safe margins.</li>
            <li>Use CMYK 300 DPI images and high-res PDFs.</li>
            <li>Black text: C0 M0 Y0 K100. Large solids: C30 M20 Y20 K100.</li>
            <li>Embed or outline all fonts.</li>
            <li>Prefer CMYK-only unless the product requires RGB/PMS.</li>
          </ol>

          <h4 className="mt-6 text-base font-semibold">Thin White Text on Rich Black Backgrounds</h4>
          <div className="mt-2 text-sm text-gray-700 max-w-3xl space-y-2">
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong>Use C30 M20 Y20 K100 for Rich Black</strong> to avoid oversaturation & registration issues.</li>
              <li>
                <strong>Thicken White Knockout Text</strong> — min line weight <strong>0.75 pt</strong>,
                min font size <strong>8 pt</strong>.
              </li>
              <li><strong>Apply Swelling</strong> to keep knockout text crisp after printing.</li>
            </ol>
          </div>

          <div className="mt-6 border-t pt-4 text-sm text-gray-700">
            <h4 className="font-semibold">Large Format Guidelines</h4>
            <p>Bleed is not required for large format projects, but it is recommended.</p>
          </div>
        </div>
      </details>
    </div>
  );

  /* ---------- Starting price (best effort) ---------- */
  let startingPriceDisplay: string | undefined;
  try {
    const snap = await getDefaultPriceSnapshot(sinaliteIdNum);
    if (snap && typeof (snap as any).price === "number") {
      startingPriceDisplay = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: (snap as any).currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format((snap as any).price);
    }
  } catch {}

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-28 md:pb-8">
      {/* Breadcrumbs */}
      <nav className="mb-5 text-sm text-gray-600" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link className="hover:underline" href="/">Home</Link></li>
          <li>/</li>
          <li><Link className="hover:underline" href={`/categories/${categorySlug}`}>{readableCat}</Link></li>
          <li>/</li>
          <li><Link className="hover:underline" href={`/categories/${categorySlug}/${subcategorySlug}`}>{friendlySub}</Link></li>
          <li>/</li>
          <li aria-current="page" className="text-gray-900 font-medium">{productName}</li>
        </ol>
      </nav>

      <header className="mb-3">
        <h1 className="text-2xl md:text-3xl font-semibold">{productName}</h1>
        {prodRow.description ? <p className="mt-2 max-w-2xl text-gray-600">{prodRow.description}</p> : null}
      </header>

      <section className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,720px)_minmax(0,460px)]">
        {/* LEFT */}
        <div>
          <ProductGallery images={gallery} productName={productName} />
          <ProductInfoTabs
            details={detailsPanel}
            filePrep={filePrepPanel}
            reviewsSlot={<ProductReviews productId={String(sinaliteIdNum)} productName={productName} />}
          />
        </div>

        {/* RIGHT: Buy Box */}
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
  optionGroups={buyBoxGroups}  // ✅ numeric ids
  store="US"
  cloudflareImageId={heroCfId}
/>


            <div className="mt-3 text-xs text-gray-600">
              {startingPriceDisplay ? <>From <strong>{startingPriceDisplay}</strong></> : <>Live pricing</>}
            </div>
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
