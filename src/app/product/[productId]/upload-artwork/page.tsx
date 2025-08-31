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
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
};

function first(sp: PageSearchParams, key: string) {
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : v;
}

async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

export default async function UploadArtworkPage(props: PageProps) {
  const { productId } = await props.params;
  const searchParams = await props.searchParams;

  const jar = await getJar();
  const sid = jar.get?.("adap_sid")?.value ?? jar.get?.("sid")?.value;
  if (!sid) return <EnsureSessionGate />;

  const sidesParam = first(searchParams, "sides");
  const numSides = sidesParam ? Number(sidesParam) || 2 : 2;

  // may be undefined; when present, pass as `lineId` (not `initialLineId`)
  const initialLineId = first(searchParams, "lineId");

  return (
    <main className="container py-6">
      <h1 className="text-2xl font-semibold">Upload Artwork</h1>
      <p className="text-neutral-600 mb-3">
        Upload your print-ready files. We’ll attach them to your order and show them on the review page.
      </p>

      <ArtworkUploadBoxes
        productId={productId}
        numSides={numSides}
        lineId={initialLineId}  
      />

      <div className="mt-4">
        <ContinueAfterUpload href="/cart/review" />
      </div>
    </main>
  );
}
