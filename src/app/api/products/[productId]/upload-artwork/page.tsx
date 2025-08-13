// src/app/products/[productId]/upload-artwork/page.tsx
import type { Metadata } from "next";
import ArtworkUploadBoxes from "@/components/ArtworkUploadBoxes";

export const dynamic = "force-dynamic";

export function generateMetadata({
  params,
  searchParams,
}: {
  params: { productId: string };
  searchParams: { sides?: string };
}): Metadata {
  const id = params.productId;
  const sides = Number(searchParams?.sides || "1");
  return {
    title: `Upload Artwork — Product ${id}`,
    description: `Upload print-ready PDF${sides > 1 ? "s" : ""} for Product ${id}.`,
  };
}

export default async function UploadArtworkPage({
  params,
  searchParams,
}: {
  params: { productId: string };
  searchParams: { sides?: string };
}) {
  const id = params.productId;
  const sides = Math.max(1, Math.min(10, Number(searchParams?.sides || "1"))); // safety cap

  return (
    <main className="container" style={{ padding: 24 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: "1.6rem" }}>Upload Artwork</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Please upload {sides > 1 ? `${sides} PDF files (one per side)` : "a single PDF file"} for Product {id}.
          Files should be 300dpi, include 1/8&quot; bleed, and final trim size.
        </p>
      </header>

      <section className="ui-card">
        <ArtworkUploadBoxes productId={id} numSides={sides} />
      </section>
    </main>
  );
}
