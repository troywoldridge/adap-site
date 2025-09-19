// src/app/subcategories/[subcategoryId]/page.tsx
import "server-only";
import Image from "@/components/ImageSafe";
import ProductGrid from "@/components/ProductGrid";
import { mergeProduct, mergeSubcategory } from "@/lib/mergeUtils";
// ⬇️ server-side SinaLite client per docs
import { getProductsBySubcategory, getSubcategoryDetails } from "@/lib/sinalite.server";
import type { Metadata } from "next";

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Minimal storefront product shape from SinaLite — id may be string or number */
type StorefrontProduct = {
  id: string | number;
  sku?: string;
  [k: string]: any;
};

/* ----------------------------- SEO ----------------------------- */
export async function generateMetadata({
  params,
}: {
  params: { subcategoryId: string };
}): Promise<Metadata> {
  const subId = toInt(params.subcategoryId);
  const subFromMerge =
    subId !== null
      ? (mergeSubcategory({ id: subId }) as any)
      : (mergeSubcategory({ slug: params.subcategoryId }) as any);

  // Fetch SinaLite details (name/slug/desc/image) when ID numeric
  const fromSina = subId !== null ? await getSubcategoryDetails(subId) : undefined;

  const name = subFromMerge?.name ?? fromSina?.name;
  const description = subFromMerge?.description ?? fromSina?.description ?? "";
  const image = subFromMerge?.image ?? fromSina?.image;

  return {
    title: name ? `${name} | Shop Print Products` : "Shop Print Products | American Design And Printing",
    description: description || "Shop our print product lineup by subcategory.",
    openGraph: {
      title: name || "Shop Print Products",
      description: description || "",
      images: image ? [image] : [],
    },
  };
}

/* ----------------------------- Page ----------------------------- */
export default async function SubcategoryProductsPage({
  params,
}: {
  params: { subcategoryId: string };
}) {
  const subId = toInt(params.subcategoryId);
  const storeCode = process.env.NEXT_PUBLIC_STORE_CODE;

  if (subId === null) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-red-600">Invalid subcategory</h1>
        <p className="mt-2 text-neutral-700">We couldn’t recognize that subcategory.</p>
      </main>
    );
  }

  // Merge local (for asset image mapping) + SinaLite (authoritative text)
  const local = mergeSubcategory({ id: subId }) as any;
  const sina = await getSubcategoryDetails(subId, storeCode);
  const subName = local?.name ?? sina?.name ?? "Products";
  const subDesc = local?.description ?? sina?.description ?? "";
  const subImage = local?.image ?? sina?.image;

  // Products from SinaLite, then merged for local image ids/attrs if any
  const rawProducts = (await getProductsBySubcategory(subId, storeCode)) as StorefrontProduct[];

  // ✅ Fix: wrap the callback and normalize id -> number for mergeProduct
  const products = rawProducts.map((apiProd: StorefrontProduct) => {
    const idNum =
      typeof apiProd.id === "string" ? Number(apiProd.id) : Number(apiProd.id);
    const safeProd = {
      ...apiProd,
      id: Number.isFinite(idNum) ? idNum : undefined, // mergeProduct expects numeric id | undefined
    };
    return mergeProduct(safeProd as any);
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Subcategory hero */}
      <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm ring-1 ring-black/5">
        {subImage && (
          <div className="overflow-hidden rounded-xl border">
            {/* subImage is a URL from SinaLite or local assets — delivered via Cloudflare CDN */}
            <Image
              src={subImage}
              alt={subName}
              width={1200}
              height={320}
              className="h-auto w-full object-cover"
              priority
              unoptimized
            />
          </div>
        )}
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{subName}</h1>
        {!!subDesc && <p className="mt-2 max-w-3xl text-sm text-neutral-700">{subDesc}</p>}
      </section>

      {/* Product grid */}
      <ProductGrid products={products as any[]} />
    </main>
  );
}
