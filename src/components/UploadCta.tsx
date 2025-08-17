// src/components/UploadCta.tsx
"use client";

import * as React from "react";
import { toProxyArtworkUrl } from "@/lib/r2-url";

type ExistingRecord = Record<string, string>;
type ExistingArray = Array<{ side: number; url: string }>;

type Props = {
  lineId: string;
  numSides: number; // 1, 2, 4, etc.
  /** Accept both shapes to keep callers simple */
  existing?: ExistingRecord | ExistingArray | null;
};

function toRecord(existing: Props["existing"]): ExistingRecord {
  if (!existing) {
    return {};
  }
  if (Array.isArray(existing)) {
    const out: ExistingRecord = {};
    for (const row of existing) {
      if (!row) {
        continue;
      }
      const s = Number(row.side);
      if (Number.isFinite(s) && row.url) {
        out[String(s)] = String(row.url);
      }
    }
    return out;
  }
  return existing;
}

export default function UploadCta({ lineId, numSides, existing = null }: Props) {
  const [busySide, setBusySide] = React.useState<number | null>(null);
  const inputsRef = React.useRef<Record<number, HTMLInputElement | null>>({});

  const existingRec = React.useMemo(() => toRecord(existing), [existing]);
  const sides = React.useMemo(
    () => Array.from({ length: Math.max(1, numSides) }, (_, i) => i + 1),
    [numSides]
  );

  const pick = React.useCallback((side: number) => {
    inputsRef.current[side]?.click();
  }, []);

  const onFileChange = React.useCallback(
    async (side: number, ev: React.ChangeEvent<HTMLInputElement>) => {
      const file = ev.target.files?.[0];
      if (!file) {
        return;
      }

      setBusySide(side);
      try {
        // 1) Get presigned PUT and public URL from server
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, lineId, side }),
        });

        const { uploadUrl, publicUrl, error } = (await presignRes.json()) as {
          uploadUrl?: string;
          publicUrl?: string;
          error?: string;
        };

        if (!presignRes.ok || !uploadUrl || !publicUrl) {
          throw new Error(error || "Failed to presign upload");
        }

        // 2) Upload bytes THROUGH our server proxy (to dodge browser->R2 CORS)
        const fd = new FormData();
        fd.append("file", file);
        fd.append("uploadUrl", uploadUrl);
        fd.append("contentType", file.type || "application/octet-stream");

        const proxyRes = await fetch("/api/uploads/put", {
          method: "POST",
          body: fd,
        });
        if (!proxyRes.ok) {
          const t = await proxyRes.text().catch(() => "");
          throw new Error(t || `Upload failed (${proxyRes.status})`);
        }

        // 3) Save the *public* R2 URL to the cart line/side (DB can store canonical URL)
        const saveRes = await fetch("/api/cart/artwork", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lineId, side, url: publicUrl }),
        });

        const saved = await saveRes.json().catch(() => ({}));
        if (!saveRes.ok || !saved?.ok) {
          throw new Error(saved?.error || "Failed to save artwork");
        }

        // 4) Refresh (or call a cart refresh hook)
        location.reload();
      } catch (e: any) {
        alert(e?.message ?? "Upload failed");
      } finally {
        setBusySide(null);
        ev.target.value = ""; // reset so same file can be picked again
      }
    },
    [lineId]
  );

  return (
    <div className="upload-cta">
      {sides.map((side) => {
        // show via proxy no matter what shape is stored
        const savedUrl = existingRec[String(side)] || "";
        const displayUrl = toProxyArtworkUrl(savedUrl);
        const label = savedUrl ? "Replace" : "Upload artwork";

        return (
          <div key={side} className="upload-slot">
            {/* Thumbnail or placeholder */}
            {savedUrl ? (
              <img src={displayUrl} alt={`Artwork side ${side}`} className="art-thumb" />
            ) : (
              <div
                className="art-thumb"
                style={{ display: "grid", placeItems: "center", color: "#9ca3af" }}
              >
                No art (Side {side})
              </div>
            )}

            {/* Hidden file input per side */}
            <input
              ref={(el) => {
                inputsRef.current[side] = el;
                return undefined; // satisfy TS for ref type
              }}
              type="file"
              accept="image/*,application/pdf"
              className="hidden-input"
              onChange={(e) => onFileChange(side, e)}
            />

            {/* Upload / Replace button */}
            <button
              type="button"
              className="upload-btn"
              onClick={() => pick(side)}
              disabled={busySide === side}
              aria-busy={busySide === side}
            >
              {busySide === side ? "Uploading…" : label}
            </button>

            {/* Remove button when artwork exists */}
            {savedUrl && (
              <button
                type="button"
                className="upload-btn"
                onClick={async () => {
                  if (!confirm(`Remove artwork for side ${side}?`)) return;
                  try {
                    const res = await fetch("/api/cart/artwork", {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ lineId, side, url: "" }),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok || !json?.ok)
                      throw new Error(json?.error || "Failed to clear artwork");
                    location.reload();
                  } catch (e: any) {
                    alert(e?.message ?? "Failed to clear artwork");
                  }
                }}
              >
                Remove
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
