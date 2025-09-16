// src/app/product/[productId]/upload-artwork/page.tsx
import "server-only";
import Link from "next/link";
import ArtworkUploadBoxes from "@/components/ArtworkUploadBoxes";

export const dynamic = "force-dynamic";

type Params = { productId: string };
type Search = { lineId?: string; sides?: string; focusSide?: string };

function coerceSides(v?: string) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= 10 ? Math.floor(n) : 2; // default 2 sides
}

export default async function UploadArtworkPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { productId } = await params;
  const sp = await searchParams;

  const lineId =
    (sp.lineId && /^[a-zA-Z0-9_-]{2,64}$/.test(sp.lineId)
      ? sp.lineId
      : null) ||
    (globalThis.crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2));

  const sides = coerceSides(sp.sides);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-gray-600">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link className="hover:underline" href="/">Home</Link></li>
          <li>/</li>
          <li>
            <Link className="hover:underline" href="/categories">
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

      {/* Client component — pass only primitives */}
      <ArtworkUploadBoxes lineId={lineId} sides={sides} />
    </main>
  );
}

