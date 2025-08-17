// src/app/product/[productId]/page.tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  getSinaliteProductMeta,
  getSinaliteProductArrays,
  normalizeOptionGroups,
  getDefaultPriceSnapshot,
} from "@/lib/sinalite.client";
import { productImagesForProductId } from "@/lib/product-images";
import { productJsonLd, breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import ProductConfigurator from "@/components/product/ProductConfigurator";
// ✅ Use the BuyBox wrapper to wire configurator ↔ add-to-cart
import ProductBuyBox from "@/components/product/ProductBuyBox";

export const dynamic = "force-dynamic";

// ---------- SEO (server) ----------
export async function generateMetadata({
  params,
}: {
  params: { productId: string };
}): Promise<Metadata> {
  const id = params.productId;
  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(id);
  } catch {
    // ignore
  }

  const name = meta?.name || `Product ${id}`;
  const desc = meta?.description || `Order ${name} online — trade pricing via SinaLite.`;
  const url = absoluteUrl(`/product/${id}`);
  const images = productImagesForProductId(id); // Cloudflare Images CDN

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

// ---------- Page (server) ----------
export default async function ProductPage({
  params,
}: {
  params: { productId: string };
}) {
  const id = params.productId;

  // Guard against invalid ids
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return notFound();
  }

  // Meta
  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(id);
  } catch {
    return notFound();
  }
  if (!meta) {
    return notFound();
  }

  // Options (array → normalized groups)
  const { optionsArray } = await getSinaliteProductArrays(id);
  const optionGroups = normalizeOptionGroups(optionsArray || []);

  // Gallery (Cloudflare CDN)
  const gallery = productImagesForProductId(id);
  const hero = gallery[0] || "https://placehold.co/800x600?text=No+Image";
  const url = absoluteUrl(`/product/${id}`);

  // Best-effort default price (for JSON-LD offer)
  const offer = await getDefaultPriceSnapshot(id); // { price, currency } | null

  // JSON-LD
  const productLd = productJsonLd({
    id,
    name: meta?.name || `Product ${id}`,
    description: meta?.description || "",
    images: gallery,
    sku: meta?.sku || null,
    brand: "SinaLite",
    url,
    category: meta?.category || undefined,
    offer: offer
      ? {
          price: offer.price,
          currency: offer.currency,
          availability: "https://schema.org/InStock",
        }
      : null,
  });

  const crumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: meta?.category || "Products", url: absoluteUrl("/categories") },
    { name: meta?.name || `Product ${id}`, url },
  ]);

  return (
    <main className="page-container">
      {/* JSON-LD (server-rendered) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <script
        type="application/ld+json"
        id="product-jsonld"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      {/* Title row */}
      <header className="product-header">
        <h1 className="product-title">{meta?.name}</h1>
        {meta?.description ? <p className="product-desc">{meta.description}</p> : null}
      </header>

      {/* Main layout: gallery + config */}
      <section className="product-grid">
        {/* Left: images */}
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

        {/* Right: configurator + add-to-cart (wired via BuyBox) */}
        {/* Right: configurator + add-to-cart (via BuyBox) */}
  <ProductBuyBox productId={id} optionGroups={optionGroups} />
      </section>
    </main>
  );
}
