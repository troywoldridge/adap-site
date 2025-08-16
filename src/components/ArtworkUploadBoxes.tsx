"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

type UploadedPart = {
  // whatever you return after uploading to R2/Cloudflare Images (e.g., image id or URL)
  fileName: string;
  storageId: string;
};

export default function ArtworkUploadBoxes({
  productId,
  numSides,
  cartLines,
}: {
  productId: string;
  numSides: number;
  // Pass the current cart lines for this product so we can pin uploads to the line(s)
  cartLines: Array<{ lineId: string; quantity: number }>;
}) {
  const [files, setFiles] = useState<(File | null)[]>(Array(numSides).fill(null));
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { isSignedIn } = useAuth();

  async function handleFileChange(i: number, f: File | null) {
    const next = files.slice();
    next[i] = f;
    setFiles(next);
  }

  async function uploadAll(): Promise<UploadedPart[]> {
    // Replace this with your existing upload code that stores to Cloudflare Images/R2
    // and returns an ID we can associate in the DB.
    const results: UploadedPart[] = [];
    for (const f of files) {
      if (!f) continue;
      // Example: POST to your own uploader
      const form = new FormData();
      form.append("file", f);
      const resp = await fetch("/api/uploads/artwork", { method: "POST", body: form });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      results.push({ fileName: f.name, storageId: data.id });
    }
    return results;
  }

  async function attachToCart(parts: UploadedPart[]) {
    // Persist the uploaded assets against the cart line(s) in your DB
    // so Review Order has everything it needs.
    const resp = await fetch("/api/cart/attachments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId,
        cartLines,
        parts,
      }),
    });
    if (!resp.ok) throw new Error(await resp.text());
  }

  async function onContinue() {
    try {
      setError(null);
      setUploading(true);

      // 1) Upload to Cloudflare storage (returns IDs)
      const parts = await uploadAll();

      // 2) Attach uploads to cart lines in DB
      await attachToCart(parts);

      setDone(true);
      setUploading(false);

      // 3) Security gate: if not signed in, send to sign-in with redirect to /cart/review
      if (!isSignedIn) {
        const redirectUrl = encodeURIComponent("/cart/review");
        router.push(`/sign-in?redirect_url=${redirectUrl}`);
        return;
      }

      // 4) Signed in → go straight to Review Order
      router.push("/cart/review");
    } catch (e: any) {
      setUploading(false);
      setError(e?.message || "Upload failed.");
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Upload Artwork</h3>

      <div className="grid gap-3">
        {Array.from({ length: numSides }).map((_, i) => (
          <label key={i} className="block">
            <span className="text-sm font-medium">Side {i + 1}</span>
            <input
              type="file"
              accept="image/*,.pdf,.ai,.eps"
              className="mt-1 block w-full border rounded p-2"
              onChange={(e) => handleFileChange(i, e.target.files?.[0] ?? null)}
            />
          </label>
        ))}
      </div>

      {error && <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={onContinue}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {uploading ? "Processing…" : "Go to review order"}
        </button>
        {done && <span className="text-sm text-green-700">Artwork saved to your cart.</span>}
      </div>
    </div>
  );
}
