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
import UploadCta from "@/components/UploadCta";

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
    // ignore: product may be unavailable; we'll handle in the page
  }

  const name = meta?.name || `Product ${id}`;
  const desc = meta?.description || `Order ${name} online — trade pricing via SinaLite.`;
  const url = absoluteUrl(`/product/${id}`);
  const images = productImagesForProductId(id); // served via Cloudflare Images CDN

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

  // Guard against invalid ids (e.g. /product/0)
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return notFound();
  }

  // Meta (per SinaLite API docs, product can be unavailable)
  let meta: any = null;
  try {
    meta = await getSinaliteProductMeta(id);
  } catch {
    return notFound();
  }
  if (!meta) {
    return notFound();
  }

  // Options (array → normalized groups). If upstream returns no arrays, we still render safely.
  const { optionsArray } = await getSinaliteProductArrays(id);
  const optionGroups = normalizeOptionGroups(optionsArray || []);

  // Gallery (Cloudflare CDN)
  const gallery = productImagesForProductId(id);
  const hero = gallery[0] || "https://placehold.co/800x600?text=No+Image";
  const url = absoluteUrl(`/product/${id}`);

  // Best-effort default price (safe if upstream has no data)
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
    <main className="container" style={{ padding: 24 }}>
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
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: "1.8rem" }}>{meta?.name}</h1>
        {meta?.description ? (
          <p className="muted" style={{ marginTop: 8, maxWidth: 720 }}>
            {meta.description}
          </p>
        ) : null}
      </header>

      {/* Main layout: gallery + config */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 1fr) 420px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Left: images (Cloudflare delivery keeps it blazing fast) */}
        <div>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "4 / 3",
              overflow: "hidden",
              borderRadius: 12,
              background: "#f5f5f5",
            }}
          >
            <Image
              src={hero}
              alt={meta?.name || `Product ${id}`}
              fill
              sizes="(max-width: 900px) 100vw, 600px"
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
          {gallery.length > 1 && (
            <ul
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
                gap: 10,
                padding: 0,
                listStyle: "none",
                marginTop: 12,
              }}
            >
              {gallery.map((u, i) => (
                <li key={i} style={{ position: "relative", aspectRatio: "1 / 1" }}>
                  <Image
                    src={u}
                    alt={`${meta?.name} ${i + 1}`}
                    fill
                    sizes="92px"
                    style={{ objectFit: "cover", borderRadius: 8 }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: live pricing configurator (client) + shipping estimator + upload CTA */}
        <div className="space-y-4">
          <ProductConfigurator productId={id} options={optionGroups} />
          {/* Upload Artwork step (presigned PUT to Cloudflare R2) */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
            <UploadCta productId={id} />
          </div>
        </div>
      </section>
    </main>
  );
}
