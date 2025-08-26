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

// Next 14/15 cookie getter
async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

export default async function UploadArtworkPage({ params, searchParams }: PageProps) {
  const productId = params.productId;

  // If no SID cookie yet, render a client gate that creates a session then refreshes
  const jar = await getJar();
  const sid = jar.get?.("adap_sid")?.value ?? jar.get?.("sid")?.value;
  if (!sid) return <EnsureSessionGate />;

  const sidesParam = readParam(searchParams, "sides");
  const numSides = sidesParam ? Number(sidesParam) || 2 : 2;

  return (
    <main className="container" style={{ padding: 24 }}>
      <h1>Upload Artwork</h1>
      <p className="muted" style={{ marginBottom: 12 }}>
        Upload your print-ready files. We’ll attach them to your order and show them on the review page.
      </p>

      <ArtworkUploadBoxes productId={productId} numSides={numSides} cartLines={[]} />

      <ContinueAfterUpload />
    </main>
  );
}

/** Client widget: shows "Continue to Cart" only after an upload success event */
function ContinueAfterUpload() {
  "use client";
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setOk(true);
    window.addEventListener("adap:artworkUploaded", handler as EventListener);
    return () => window.removeEventListener("adap:artworkUploaded", handler as EventListener);
  }, []);

  if (!ok) {
    return (
      <p className="muted" style={{ marginTop: 12 }}>
        Upload at least one file to continue.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Link href="/cart" className="btn btn-primary">Continue to Cart</Link>
    </div>
  );
}
