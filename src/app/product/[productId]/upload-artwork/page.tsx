// src/app/product/[productId]/upload-artwork/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import ArtworkUploadBoxes from "@/components/ArtworkUploadBoxes";
import EnsureSessionGate from "@/components/EnsureSessionGate";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { productId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function readParam(sp: PageProps["searchParams"], key: string): string | undefined {
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : v;
}

// Next 14/15-safe cookie getter
async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

export default async function UploadArtworkPage({ params, searchParams }: PageProps) {
  const productId = params.productId;

  // If no SID cookie yet, render a client gate that POSTs /api/session/ensure and refreshes
  const jar = await getJar();
  const sid = jar.get?.("adap_sid")?.value ?? jar.get?.("sid")?.value;
  if (!sid) {
    return <EnsureSessionGate />;
  }

  // Optional query: ?sides= and ?lineId= (we don’t pass lineId to the component since it doesn’t accept it)
  const sidesParam = readParam(searchParams, "sides");
  const numSides = sidesParam ? Number(sidesParam) || 2 : 2;

  // NOTE: ArtworkUploadBoxes expects: { productId, numSides, cartLines }
  // If you want to attach uploads to a specific cart line, fetch the cart
  // here and pass a filtered array. For now we pass an empty array.
  const cartLines: any[] = [];

  return (
    <main className="container" style={{ padding: 24 }}>
      <h1>Upload Artwork</h1>
      <p className="muted" style={{ marginBottom: 12 }}>
        Upload your print-ready files. We’ll attach them to your order and show them on the review page.
      </p>

      <ArtworkUploadBoxes
        productId={productId}
        numSides={numSides}
        cartLines={cartLines}
      />

      <div style={{ marginTop: 16 }}>
        <Link href={`/review-order`} className="btn btn-secondary">
          Go to Review Order
        </Link>
      </div>
    </main>
  );
}
