"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getPresignedUrl, uploadToPresignedUrl, attachArtworkToOrder } from "@/lib/uploadArtwork";

type Props = {
  productId: string | number;
  numSides: number;
  orderSessionId: string; // <-- NEW
  orderId?: number | string | null;       // optional if you already have one
  orderItemId?: number | string | null;   // optional if per-line item
};

export default function ArtworkUploadBoxes({
  productId,
  numSides,
  orderSessionId,
  orderId = null,
  orderItemId = null,
}: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<(File | null)[]>(Array(numSides).fill(null));
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicUrls, setPublicUrls] = useState<string[]>([]);

  function setFile(idx: number, f: File | null) {
    const next = [...files];
    next[idx] = f;
    setFiles(next);
  }

  async function startUpload() {
    setError(null);
    setDone(false);
    setUploading(true);

    try {
      const uploaded: {
        publicUrl: string;
        filename: string;
        contentType: string;
        storageKey: string;
        bucket: string;
        sideIndex: number;
      }[] = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!f) {
          throw new Error("Please select all artwork files.");
        }

        // 1) Presign (use orderSessionId during checkout)
        const presign = await getPresignedUrl({
          filename: f.name,
          contentType: f.type || "application/octet-stream",
          orderSessionId,
          productId,
          sideIndex: i,
        });

        // 2) Upload to R2
        await uploadToPresignedUrl(presign.uploadUrl, f);

        uploaded.push({
          publicUrl: presign.publicUrl,
          filename: f.name,
          contentType: f.type || "application/octet-stream",
          storageKey: presign.storageKey,
          bucket: presign.bucket,
          sideIndex: i,
        });
      }

      setPublicUrls(uploaded.map((u) => u.publicUrl));

      // 3) Persist to DB
      await attachArtworkToOrder({
        orderSessionId,
        productId,
        files: uploaded,
        orderId: orderId ?? null,
        orderItemId: orderItemId ?? null,
        // If you already made a SinaLite job, add its id here:
        // sinaliteJobId: "abc123",
      });

      setDone(true);

      // 4) Optional local cache for resilience
      const key = `adap_session_${orderSessionId}_artwork`;
      const next = Array.isArray(uploaded) ? uploaded : [];
      localStorage.setItem(key, JSON.stringify(next));
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function goReview() {
    router.push(`/review-order`);
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
              <li key={i}>
                <a className="underline" href={u} target="_blank" rel="noreferrer">
                  {u}
                </a>
              </li>
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
