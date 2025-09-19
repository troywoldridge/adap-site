// src/components/UploadCta.tsx
"use client";

import * as React from "react";

type ExistingRecord = Record<string, string>;
type ExistingArray = Array<{ side: number; url: string }>;

type Props = {
  lineId: string;
  numSides: number; // 1, 2, 4, etc.
  /** Accept both shapes to keep callers simple */
  existing?: ExistingRecord | ExistingArray | null;
};

/**
 * Optional proxy:
 * If you want to serve artwork through your app (e.g., set headers, CF cache, hide origin),
 * set NEXT_PUBLIC_ARTWORK_PROXY_PREFIX to something like `/api/uploads/proxy?url=`.
 * Otherwise we'll just return the original public R2 URL.
 */
function toProxyArtworkUrl(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const prefix = process.env.NEXT_PUBLIC_ARTWORK_PROXY_PREFIX;
  if (prefix && typeof prefix === "string" && prefix.length > 0) {
    return `${prefix}${encodeURIComponent(s)}`;
  }
  return s;
}

function toRecord(existing: Props["existing"]): ExistingRecord {
  if (!existing) return {};
  if (Array.isArray(existing)) {
    const out: ExistingRecord = {};
    for (const row of existing) {
      if (!row) continue;
      const side = Number(row.side);
      if (Number.isFinite(side) && row.url) out[String(side)] = String(row.url);
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
      if (!file) return;

      setBusySide(side);
      try {
        // 1) Ask server for presigned PUT + public URL (R2)
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

        // 2) Upload bytes THROUGH our server proxy (avoids browser→R2 CORS issues)
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

        // 3) Save the public R2 URL to the line/side in your backend
        const saveRes = await fetch("/api/cart/artwork", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lineId, side, url: publicUrl }),
        });

        const saved = await saveRes.json().catch(() => ({}));
        if (!saveRes.ok || !saved?.ok) {
          throw new Error(saved?.error || "Failed to save artwork");
        }

        // 4) Refresh (or swap to a cart refresh hook if you have one)
        location.reload();
      } catch (e: any) {
        alert(e?.message ?? "Upload failed");
      } finally {
        setBusySide(null);
        ev.target.value = ""; // reset so user can re-select same file
      }
    },
    [lineId]
  );

  return (
    <div className="upload-cta">
      {sides.map((side) => {
        const savedUrl = existingRec[String(side)] || "";
        const displayUrl = toProxyArtworkUrl(savedUrl);
        const label = savedUrl ? "Replace" : "Upload artwork";

        return (
          <div key={side} className="upload-slot">
            {/* Thumbnail or placeholder */}
            {savedUrl ? (
              // Artwork display: public R2 URL is fine for <img> (no CORS needed)
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
                return undefined;
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
