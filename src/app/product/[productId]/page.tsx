import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getSinaliteProductMeta,
  getSinaliteProductArrays,
  normalizeOptionGroups,
  getDefaultPriceSnapshot,
} from "@/lib/sinalite.client"; // (SinaLite API docs)
import { productImagesForProductId } from "@/lib/product-images"; // Cloudflare CDN URLs
import { productJsonLd, breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import ProductBuyBox from "@/components/product/ProductBuyBox";

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
    const groupName = String(
      gg?.name ?? gg?.groupName ?? gg?.label ?? gg?.title ?? ""
    ).trim();
    if (!groupName) continue;

    const rawItems: unknown[] = Array.isArray(gg?.options)
      ? gg.options
      : Array.isArray(gg?.values)
      ? gg.values
      : Array.isArray(gg?.items)
      ? gg.items
      : Array.isArray(gg?.choices)
      ? gg.choices
      : [];

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
      .filter(Boolean) as { id: number; name: string }[];

    if (options.length === 0) continue;
    out.push({ name: groupName, options });
  }
  return out;
}

function parseCloudflareImageIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // /<account_hash>/<image_id>/<variant>
    const parts = u.pathname.split("/").filter(Boolean);
    // imagedelivery.net/<hash>/<id>/<variant>
    return parts.length >= 3 ? parts[2] : parts[1] || null;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────
   SEO (server)
   ────────────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId: id } = await params;

  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(id); // per SinaLite API docs
  } catch {
    // best-effort
  }

  const name = meta?.name || `Product ${id}`;
  const desc = meta?.description || `Order ${name} online — trade pricing via SinaLite.`;
  const url = absoluteUrl(`/product/${id}`);
  const images = productImagesForProductId(id); // Cloudflare CDN

  return {
    title: name,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: name,
      description: desc,
      url,
      type: "website",
      images: images?.length ? images.map((u) => ({ url: u })) : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description: desc,
      images: images?.[0] ? [images[0]] : undefined,
    },
  };
}

/* ──────────────────────────────────────────
   Page (server)
   ────────────────────────────────────────── */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId: id } = await params;

  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) return notFound();

  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(id); // per SinaLite API docs
  } catch {
    return notFound();
  }
  if (!meta) return notFound();

  const { optionsArray } = await getSinaliteProductArrays(id);
  const normalized = normalizeOptionGroups(optionsArray || []);
  const optionGroups: BuyBoxOptionGroup[] = toBuyBoxGroups(normalized);

  const gallery = productImagesForProductId(id);
  const hero =
    gallery[0] || "https://imagedelivery.net/placeholder/placeholder/public";
  const heroCfId = parseCloudflareImageIdFromUrl(hero);
  const url = absoluteUrl(`/product/${id}`);

  const offer = await getDefaultPriceSnapshot(id); // { price, currency } | null

  const productLd = {
    ...{
      "@context": "https://schema.org",
      "@type": "Product",
      name: meta?.name || `Product ${id}`,
      description: meta?.description || "",
      image: gallery,
      sku: meta?.sku || null,
      brand: "SinaLite",
      url,
      category: meta?.category || undefined,
    },
    offers: offer
      ? {
          "@type": "Offer",
          price: offer.price,
          priceCurrency: offer.currency,
          availability: "https://schema.org/InStock",
          url,
        }
      : undefined,
  };

  const crumbs = [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
    {
      "@type": "ListItem",
      position: 2,
      name: meta?.category || "Products",
      item: absoluteUrl("/categories"),
    },
    { "@type": "ListItem", position: 3, name: meta?.name || `Product ${id}`, item: url },
  ];

  return (
    <main className="page-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: crumbs,
          }),
        }}
      />
      <script
        type="application/ld+json"
        id="product-jsonld"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      <header className="product-header">
        <h1 className="product-title">{meta?.name}</h1>
        {meta?.description ? <p className="product-desc">{meta.description}</p> : null}
      </header>

      <section className="product-grid">
        {/* Left: images (Cloudflare CDN) */}
        <div>
          <div className="product-hero">
            <Image
              src={hero}
              alt={meta?.name || `Product ${id}`}
              fill
              sizes="(max-width: 900px) 100vw, 600px"
              className="object-cover"
              priority
            />
          </div>

          {gallery.length > 1 && (
            <ul className="thumb-grid">
              {gallery.map((u, i) => (
                <li key={i} className="thumb">
                  <Image
                    src={u}
                    alt={`${meta?.name} ${i + 1}`}
                    fill
                    sizes="92px"
                    className="object-cover thumb-img"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: configurator + add-to-cart */}
        <ProductBuyBox
          productId={idNum}
          productName={meta?.name || `Product ${id}`}
          optionGroups={optionGroups}
          store={"US"}
          cloudflareImageId={heroCfId}
        />
      </section>
    </main>
  );
}
