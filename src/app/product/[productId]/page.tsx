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


// optional: nicer name fallback from your asset JSON maps
import productAssetsRaw from "@/data/productAssets.json";
import imagesAssetsRaw from "@/data/images.json";

export const dynamic = "force-dynamic";

type BuyBoxOptionGroup = {
  name: string;
  options: Array<{ id: number; name: string }>;
};

function toBuyBoxGroups(groups: unknown): BuyBoxOptionGroup[] {
  const src = Array.isArray(groups) ? groups : [];
  const out: BuyBoxOptionGroup[] = [];
  for (const g of src) {
    const gg = g as any;
    const groupName = String(gg?.name ?? gg?.groupName ?? gg?.label ?? gg?.title ?? "").trim();
    if (!groupName) continue;

    const rawItems: unknown[] = Array.isArray(gg?.options)
      ? gg.options
      : Array.isArray(gg?.values) ? gg.values
      : Array.isArray(gg?.items)  ? gg.items
      : Array.isArray(gg?.choices)? gg.choices
      : [];

    const options = rawItems
      .map((o) => {
        const oo = o as any;
        const idCandidate = oo?.id ?? oo?.valueId ?? oo?.optionId ?? oo?.value ?? oo?.code ?? oo?.key;
        const idNum = Number(idCandidate);
        if (!Number.isFinite(idNum) || idNum <= 0) return null;
        const name = String(oo?.name ?? oo?.label ?? oo?.valueName ?? oo?.title ?? oo?.text ?? idCandidate ?? "").trim();
        if (!name) return null;
        return { id: idNum, name };
      })
      .filter(Boolean) as { id: number; name: string }[];

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
    return parts.length >= 3 ? parts[2] : parts[1] || null;
  } catch {
    return null;
  }
}

function titleCase(s?: string | null) {
  if (!s) return "";
  return s.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
function assetNameFallback(id: number): string | null {
  const all = [...(productAssetsRaw as any[]), ...(imagesAssetsRaw as any[])];
  const a = all.find((x) => Number(x?.product_id) === id);
  return a ? titleCase(a.name || a.matched_sku) : null;
}

/* SEO */
export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> {
  const { productId: id } = await params;
  let meta: any = null;
  try { meta = await getSinaliteProductMeta(id); } catch {}

  const idNum = Number(id);
  const name =
    meta?.name ||
    meta?.title ||
    assetNameFallback(idNum) ||
    `Product ${id}`;
  const desc = meta?.description || `Order ${name} online — trade pricing via SinaLite.`;

  return { title: name, description: desc };
}

/* Page */
export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId: id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) return notFound();

  let meta: any = null;
  try { meta = await getSinaliteProductMeta(id); } catch { return notFound(); }
  if (!meta) return notFound();

  const { optionsArray } = await getSinaliteProductArrays(id);
  const normalized = normalizeOptionGroups(optionsArray || []);
  const optionGroups: BuyBoxOptionGroup[] = toBuyBoxGroups(normalized);

  const gallery = productImagesForProductId(id);
  const hero = gallery[0] || "https://imagedelivery.net/placeholder/placeholder/public";
  const heroCfId = parseCfId(hero);

  // Breadcrumbs visible UI
  const productName = meta?.name || meta?.title || assetNameFallback(idNum) || `Product ${id}`;

  // Tabs content
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
      {meta?.filePrep
        ? <div dangerouslySetInnerHTML={{ __html: meta.filePrep }} />
        : (
          <ul className="list-disc pl-5 space-y-1">
            <li>Use CMYK color, 300 DPI (minimum).</li>
            <li>Keep text 1/8″ inside safe margins.</li>
            <li>Include 1/8″ bleed on all sides.</li>
            <li>Accepted files: PDF (preferred), AI, PSD, TIFF.</li>
          </ul>
        )
      }
    </div>
  );

  // If you already have a reviews module component, drop it here:
  // <ProductReviews productId={idNum} productName={productName} />
  const reviewsSlot = (
    <div className="text-sm text-gray-600">
      {/* Replace this stub with your real reviews component if you have it */}
      <p>No reviews yet. Be the first to leave one!</p>
    </div>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link className="hover:underline" href="/">Home</Link></li>
          <li>/</li>
          <li><Link className="hover:underline" href="/products">Products</Link></li>
          <li>/</li>
          <li aria-current="page" className="text-gray-900 font-medium">{productName}</li>
        </ol>
      </nav>

      <header className="mb-4">
        <h1 className="text-2xl font-semibold">{productName}</h1>
        {meta?.description ? <p className="mt-1 text-gray-600">{meta.description}</p> : null}
      </header>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,680px)_1fr]">
        {/* IMAGES */}
        <div>
          <div className="relative aspect-[4/3] w-full max-w-[680px] overflow-hidden rounded-2xl border">
            <Image
              src={hero}
              alt={productName}
              fill
              sizes="(min-width:1024px) 680px, 100vw"
              className="object-cover"
              priority
            />
          </div>

          {gallery.length > 1 && (
            <ul className="mt-3 grid grid-cols-4 gap-3 max-w-[680px]">
              {gallery.map((u, i) => (
                <li key={i} className="relative aspect-square overflow-hidden rounded-lg border">
                  <Image src={u} alt={`${productName} ${i + 1}`} fill sizes="25vw" className="object-cover" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* BUY BOX */}
        <div>
          <ProductBuyBox
            productId={idNum}
            productName={productName}
            optionGroups={optionGroups}
            store={"US"}
            cloudflareImageId={heroCfId}
          />
        </div>
      </section>

      {/* TABS: Details / File Prep / Reviews */}
      <ProductInfoTabs details={details} filePrep={filePrep} reviewsSlot={reviewsSlot} />
    </main>
  );
}
