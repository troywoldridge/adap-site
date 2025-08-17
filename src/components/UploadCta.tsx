"use client";

import { useState } from "react";

export default function UploadCta({ lineId, numSides, existing }: {
  lineId: string;
  numSides: number;
  existing?: Record<string, string> | null; // pass item.artwork from cart GET
}) {
  const [thumbs, setThumbs] = useState<Record<string, string>>(existing ?? {});
  const [busy, setBusy] = useState<Record<number, boolean>>({});

  async function handleSelect(side: number, file: File) {
    setBusy((s) => ({ ...s, [side]: true }));
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const presign = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lineId, side, ext }),
      }).then((r) => r.json());

      // PUT to R2
      await fetch(presign.url, { method: "PUT", body: file });

      // save public URL to cart line
      const saved = await fetch(`/api/cart/lines/${lineId}/artwork`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ side, url: presign.publicUrl }),
      }).then((r) => r.json());

      setThumbs(saved.artwork || {});
    } finally {
      setBusy((s) => ({ ...s, [side]: false }));
    }
  }

  const sides = Array.from({ length: Math.max(1, numSides) }, (_, i) => i + 1);

  return (
    <div className="upload-cta">
      {sides.map((side) => (
        <div key={side} className="upload-slot">
          {thumbs[String(side)] ? (
            <img src={thumbs[String(side)]} alt={`Artwork side ${side}`} className="art-thumb" />
          ) : (
            <label className="upload-btn">
              <input
                type="file"
                accept=".pdf,.ai,.eps,.tif,.tiff,.jpg,.jpeg,.png"
                className="hidden-input"
                onChange={(e) => e.target.files?.[0] && handleSelect(side, e.target.files[0])}
              />
              {busy[side] ? `Uploading side ${side}…` : `Upload side ${side}`}
            </label>
          )}
        </div>
      ))}
    </div>
  );
}
