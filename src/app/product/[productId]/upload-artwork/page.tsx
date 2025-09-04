// src/app/product/[productId]/upload-artwork/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import ArtworkUploadBoxes from "@/components/ArtworkUploadBoxes";
import EnsureSessionGate from "@/components/EnsureSessionGate";
import ContinueAfterUpload from "@/components/ContinueAfterUpload";

export const dynamic = "force-dynamic";

type PageParams = { productId: string };
type PageSearchParams = Record<string, string | string[] | undefined>;
type PageProps = {
  params: Promise<PageParams>;              // Next 15: Promise
  searchParams: Promise<PageSearchParams>;  // Next 15: Promise
};

function first(sp: PageSearchParams, key: string) {
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function UploadArtworkPage(props: PageProps) {
  const { productId } = await props.params;          // still handy for the “Add to cart” link
  const searchParams = await props.searchParams;

  // Next 15: cookies() must be awaited
  const jar = await cookies();
  const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value;
  if (!sid) return <EnsureSessionGate />;

  const sidesParam = first(searchParams, "sides");
  const sides = sidesParam ? Number(sidesParam) || 2 : 2;

  // Required by ArtworkUploadBoxes
  const lineId = first(searchParams, "lineId");

  return (
    <main className="container py-6">
      <h1 className="text-2xl font-semibold">Upload Artwork</h1>
      <p className="text-neutral-600 mb-3">
        Upload your print-ready files. We’ll attach them to your order and show them on the review page.
      </p>

      {/* Only render uploader when we have a valid cart line id */}
      {lineId ? (
        <ArtworkUploadBoxes
          lineId={lineId}   // ✅ required string
          sides={sides}     // ✅ correct prop name
          // cartId={...}    // optional, if you ever want to pass it
        />
      ) : (
        <div
          className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          role="status"
        >
          We couldn’t find a cart line for this upload. You can still continue to checkout, or go back to the
          product page to add the item to your cart first.
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        {/* Primary: smart button (no extra props per its typing) */}
        <ContinueAfterUpload href="/cart/review" />

        {/* Always-present safety net */}
        <Link
          href="/cart/review"
          prefetch={false}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
        >
          Continue to checkout
        </Link>

        {!lineId && (
          <Link
            href={`/product/${productId}`}
            prefetch={false}
            className="inline-flex items-center rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Add to cart to upload
          </Link>
        )}
      </div>
    </main>
  );
}
