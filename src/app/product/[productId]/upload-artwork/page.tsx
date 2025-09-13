// src/app/product/[productId]/upload-artwork/page.tsx
import "server-only";
import Link from "next/link";
import crypto from "node:crypto";
import ArtworkUploadBoxes from "@/components/ArtworkUploadBoxes";

export const dynamic = "force-dynamic";

type Params = { productId: string };
type Search = { lineId?: string; sides?: string; focusSide?: string };

function coerceSides(v?: string) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= 10 ? n : 2; // default 2 sides
}

export default function UploadArtworkPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { productId } = params;

  // Only primitives passed to client component
  const lineId =
    (searchParams.lineId && /^[a-zA-Z0-9_-]{2,64}$/.test(searchParams.lineId)
      ? searchParams.lineId
      : null) || crypto.randomUUID();

  const sides = coerceSides(searchParams.sides);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-gray-600">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link className="hover:underline" href="/">Home</Link></li>
          <li>/</li>
          <li>
            <Link
              className="hover:underline"
              href={`/categories`} // adjust if you want to link back deeper
            >
              Products
            </Link>
          </li>
          <li>/</li>
          <li aria-current="page" className="text-gray-900 font-medium">
            Upload Artwork
          </li>
        </ol>
      </nav>

      <h1 className="mb-4 text-2xl font-semibold">Upload Artwork</h1>

      {/* ✅ Client component; primitives only */}
      <ArtworkUploadBoxes lineId={lineId} sides={sides} />
    </main>
  );
}
