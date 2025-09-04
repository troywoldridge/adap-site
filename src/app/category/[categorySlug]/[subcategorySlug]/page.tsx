// src/app/category/[categorySlug]/[subcategorySlug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import categoryAssets from "@/data/categoryAssets.json";
import subcategoryAssets from "@/data/subcategoryAssets.json";
import productAssets from "@/data/productAssets.json";
import { cfImage } from "@/lib/cfImages"; // Cloudflare CDN URL builder

/* ───────────────── Types (loose to match JSON) ───────────────── */
type Category = {
  slug?: string | null;
  id?: number | string | null;
  category_id?: number | string | null;
  name?: string | null;
};

type Subcategory = {
  id?: number | string | null;
  subcategory_id?: number | string | null;
  category_id?: number | string | null;
  slug?: string | null;
  name: string;
  description?: string | null;
  cf_image_id?: string | null;
  cloudflare_id?: string | null;
  cloudflare_image_id?: string | null;
};

type Product = {
  id?: number | string | null;
  category_id?: number | string | null;
  subcategory_id?: number | string | null;
  sku?: string | null;
  name?: string | null;
  slug?: string | null;
  ["slugs (products)"]?: string | null;
  product_slug?: string | null;

  // product-level image fields
  cf_image_id?: string | null;
  cf_image_1_id?: string | null;
  cf_image_2_id?: string | null;
  cf_image_3_id?: string | null;
  cf_image_4_id?: string | null;
  cloudflare_id?: string | null;
  cloudflare_image_id?: string | null;
};

/* ───────────────── Helpers ───────────────── */
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
  return toNum(s.id ?? s.subcategory_id);
}
function ensureSubSlug(s: Subcategory): string {
  const byField = (s.slug ?? "").toString().trim();
  if (byField) return byField;
  const byName = toSlug(s.name);
  if (byName) return byName;
  const id = pickSubId(s);
  return id !== null ? `sub-${id}` : "sub";
}
function pickProductSlug(p: Product): string {
  const cands = [
    p.slug,
    p.product_slug,
    p["slugs (products)"],
    p.name ? toSlug(p.name) : "",
    p.sku ? toSlug(p.sku) : "",
  ].map((x) => (x ?? "").toString().trim());
  return cands.find(Boolean) || "";
}
function titleCaseFromSlug(slug: string) {
  return slug.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
function findSubByRouteSlug(subs: Subcategory[], routeSlug: string): Subcategory | undefined {
  const exact = subs.find((s) => ensureSubSlug(s) === routeSlug);
  if (exact) return exact;
  const m = routeSlug.match(/^sub-(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    const byId = subs.find((s) => toNum(s.id ?? s.subcategory_id) === id);
    if (byId) return byId;
  }
  return subs.find((s) => toSlug(s.name) === routeSlug);
}

/* ───────── Image selection (use your CF variant: productThumb) ───────── */
const CF_PLACEHOLDER_ID = "a90ba357-76ea-48ed-1c65-44fff4401600";

// default to your real variant; you can override via env
const CARD_VARIANT = "productThumb" as const;

function isProtocolRelative(s: string) { return s.startsWith("//"); }
function isHttpUrl(s: string) { return s.startsWith("http://") || s.startsWith("https://"); }
function isImagedeliveryUrl(s: string) {
  try { return new URL(s).hostname === "imagedelivery.net"; } catch { return false; }
}
function swapToVariant(url: string, variant: string): string {
  try {
    const u = new URL(url);
    if (u.hostname !== "imagedelivery.net") return url;
    u.pathname = u.pathname.replace(/\/([^/]+)$/, `/${variant}`);
    return u.toString();
  } catch { return url; }
}

function pickProductImageRef(p: Product): string | null {
  const refs = [
    p.cf_image_1_id, p.cf_image_2_id, p.cf_image_3_id, p.cf_image_4_id,
    p.cf_image_id, p.cloudflare_id, p.cloudflare_image_id,
  ].map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  return refs[0] || null;
}
function pickSubImageRef(sub: Subcategory): string | null {
  const refs = [sub.cf_image_id, sub.cloudflare_id, sub.cloudflare_image_id]
    .map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  return refs[0] || null;
}

function buildProductCardUrl(prodRef: string | null, subRef: string | null): string {
  // 1) Prefer product image
  if (prodRef) {
    if (isProtocolRelative(prodRef)) return "https:" + prodRef;
    if (isHttpUrl(prodRef)) return isImagedeliveryUrl(prodRef) ? swapToVariant(prodRef, CARD_VARIANT) : prodRef;

    // Treat as Cloudflare ID → try your variant, then fallbacks
    const built =
      cfImage(prodRef, CARD_VARIANT) ||
      cfImage(prodRef, "category") ||
      cfImage(prodRef, "public");
    if (built) return built;
  }

  // 2) Fallback: subcategory image
  if (subRef) {
    if (isProtocolRelative(subRef)) return "https:" + subRef;
    if (isHttpUrl(subRef)) return isImagedeliveryUrl(subRef) ? swapToVariant(subRef, "subcategoryThumb") : subRef;

    const built =
      cfImage(subRef, "subcategoryThumb") ||
      cfImage(subRef, "category") ||
      cfImage(subRef, "public");
    if (built) return built;
  }

  // 3) Last resort: Cloudflare placeholder (exists)
  return (
    cfImage(CF_PLACEHOLDER_ID, CARD_VARIANT) ||
    cfImage(CF_PLACEHOLDER_ID, "public") ||
    "/placeholder.png"
  );
}

/* ───────────────── Page (Next 15: params is async) ───────────────── */
export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string; subcategorySlug: string }>;
}) {
  const { categorySlug, subcategorySlug } = await params;

  const cats = categoryAssets as unknown as Category[];
  const subs = subcategoryAssets as unknown as Subcategory[];
  const prods = productAssets as unknown as Product[];

  const cat = cats.find((c) => (c.slug ?? "") === categorySlug);
  if (!cat) return notFound();

  const sub = findSubByRouteSlug(subs, subcategorySlug);
  if (!sub) return notFound();

  const subId = pickSubId(sub);
  const productsInSub = subId !== null ? prods.filter((p) => toNum(p.subcategory_id) === subId) : [];

  const seen = new Set<string>();
  const items = productsInSub
    .map((p) => {
      const slug = pickProductSlug(p);
      if (!slug) return null;
      const pid = toNum(p.id);
      const key = pid != null ? `id:${pid}` : `slug:${slug}`;
      if (seen.has(key)) return null;
      seen.add(key);

      const prodRef = pickProductImageRef(p);
      const subRef = pickSubImageRef(sub);
      const url = buildProductCardUrl(prodRef, subRef);

      if (process.env.NODE_ENV !== "production") {
        console.debug("[subcategory grid] image src", { key, url, prodRef, subRef });
      }

      return { slug, name: p.name || slug.replace(/-/g, " "), url };
    })
    .filter(Boolean) as { slug: string; name: string; url: string }[];

  const title = `${titleCaseFromSlug(categorySlug)} — ${titleCaseFromSlug(ensureSubSlug(sub))}`;

  return (
    <main className="container mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {sub.description ? <p className="mt-2 text-slate-600">{sub.description}</p> : null}
      </header>

      {items.length === 0 ? (
        <p className="text-slate-600">No products found in this subcategory.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.slug} className="group">
              <Link
                href={`/category/${categorySlug}/${subcategorySlug}/${p.slug}`}
                className={[
                  "block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm",
                  "transition-[transform,box-shadow] duration-200 ease-out transform-gpu",
                  "hover:-translate-y-1 hover:shadow-md hover:shadow-black/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
                ].join(" ")}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Image
                    src={p.url}
                    alt={p.name}
                    fill
                    sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
                    unoptimized // Cloudflare CDN handles optimization
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                </div>

                <div className="p-4">
                  <h2 className="text-base font-semibold">{p.name}</h2>
                  <div className="mt-2 text-blue-700 group-hover:underline text-sm font-medium">
                    View details
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
