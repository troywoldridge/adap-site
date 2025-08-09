// src/app/products/[productId]/upload-artwork/page.tsx

import ArtworkUploadBoxes from "@/components/ArtworkUploadBoxes";
import { getProductDetails } from "@/lib/sinalite.client"; // Or wherever you get product data

export default async function UploadArtworkPage({ params }: { params: { productId: string } }) {
  const { productId } = params;

  // Fetch product details to determine number of sides (fallback to 1)
  const [product] = await getProductDetails(productId, process.env.NEXT_PUBLIC_STORE_CODE!);
  // Adjust this logic based on your product structure:
  // Use product.sides if available, or 1
  const sides =
    typeof product?.sides === "number" && product.sides > 0
      ? product.sides
      : 1;

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-bold mb-5">Upload Your Artwork</h1>
      <p className="mb-5" style={{ color: "#555" }}>
        Upload your print-ready <b>PDF</b> file{(sides > 1 ? "s" : "")} for this product.
        Files must be 300dpi, with 1/8&quot; bleed, and in final trim size.
      </p>
      <ArtworkUploadBoxes productId={productId} numSides={sides} />
      <p className="mt-6 text-xs" style={{ color: "#666" }}>
        For help with artwork, <a href="/contact" className="underline">contact our team</a>.
      </p>
    </main>
  );
}
