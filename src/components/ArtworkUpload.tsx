"use client";

import { useRef, useState } from "react";

export type ArtworkFile = {
  type: "front" | "back" | "other";
  url: string;
  key: string;
  name: string;
  isImage: boolean;
  side: number;
};

export default function ArtworkUpload({
  cartId,
  lineId,
  onUploaded,
  label = "Upload Artwork",
  side = 1,
  accept = ".pdf,.ai,.eps,.png,.jpg,.jpeg,.tif,.tiff",
}: {
  cartId?: string;
  lineId: string;
  onUploaded?: (file: ArtworkFile) => void;
  label?: string;
  side?: number; // 1=front, 2=back, etc.
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick() { inputRef.current?.click(); }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      // 1) Presign to R2
      const presign = await fetch("/api/uploads/r2", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          cartId,
          lineId,
        }),
      }).then((r) => r.json());

      if (!presign?.ok) throw new Error(presign?.error || "Failed to presign");

      // 2) Upload directly to R2
      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

      const isImage = (file.type || "").startsWith("image/");

      // 3) Persist the file URL to the cart line
      const save = await fetch(`/api/cart/lines/${lineId}/artwork`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ side, url: presign.publicUrl }),
        cache: "no-store",
      }).then((r) => r.json());
      if (!save?.ok) throw new Error(save?.error || "Failed to save artwork");

      // 4) Notify parent for immediate preview
      onUploaded?.({
        type: side === 1 ? "front" : side === 2 ? "back" : "other",
        url: presign.publicUrl, // served by Cloudflare (CDN)
        key: presign.key,
        name: file.name,
        isImage,
        side,
      });
    } catch (err: any) {
      setError(err?.message ?? "Upload error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="upload-wrap">
      <input ref={inputRef} type="file" accept={accept} className="hidden-input" onChange={onChange} />
      <button className="btn upload-btn" onClick={pick} disabled={busy}>
        {busy ? "Uploading…" : label}
      </button>
      {error && <div className="error-text">{error}</div>}
    </div>
  );
}
