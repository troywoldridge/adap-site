// src/components/ArtworkUploadBoxes.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPresignedUrl, uploadToPresignedUrl } from "@/lib/uploadArtwork";

type Props = {
  productId: string;
  numSides: number;
  orderId: string;
};

export default function ArtworkUploadBoxes({ productId, numSides, orderId }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<(File | null)[]>(Array(numSides).fill(null));
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicUrls, setPublicUrls] = useState<string[]>([]);

  function setFile(idx: number, file: File | null) {
    const next = [...files];
    next[idx] = file;
    setFiles(next);
  }

  async function startUpload() {
    setError(null);
    setDone(false);
    setUploading(true);

    try {
      const urls: string[] = [];
      for (const f of files) {
        if (!f) {
          throw new Error("Please select all artwork files.");
        }
        const { uploadUrl, publicUrl } = await getPresignedUrl({
          filename: f.name,
          contentType: f.type || "application/octet-stream",
          orderId,
        });
        await uploadToPresignedUrl(uploadUrl, f);
        urls.push(publicUrl);
      }

      setPublicUrls(urls);
      setDone(true);

      // Persist on client (simple, reliable)
      const key = `adap_order_${orderId}_artwork`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const next = Array.isArray(existing) ? existing : [];
      next.push({ productId, files: urls, uploadedAt: Date.now() });
      localStorage.setItem(key, JSON.stringify(next));

      // (Optional) Also POST to your server to attach to order in DB:
      // await fetch("/api/orders/attach-artwork", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, productId, files: urls }) }).catch(()=>{});
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function goReview() {
    router.push(`/review-order?orderId=${encodeURIComponent(orderId)}`);
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: numSides }).map((_, i) => (
        <div key={i} className="border rounded p-3">
          <label className="block text-sm font-medium mb-2">Artwork Side {i + 1}</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(i, e.target.files?.[0] || null)}
          />
        </div>
      ))}

      <button className="btn btn-primary" onClick={startUpload} disabled={uploading}>
        {uploading ? "Uploading…" : "Upload Artwork"}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {done && (
        <div className="mt-3 space-y-2">
          <p className="text-green-600">Upload complete! 🎉</p>
          <ul className="list-disc ml-5">
            {publicUrls.map((u, i) => (
              <li key={i}><a className="underline" href={u} target="_blank" rel="noreferrer">{u}</a></li>
            ))}
          </ul>

          <button className="btn btn-secondary mt-3" onClick={goReview}>
            Continue to Review Order
          </button>
        </div>
      )}
    </div>
  );
}
