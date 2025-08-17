// src/components/UploadCta.tsx
"use client";

import * as React from "react";

type Props = {
  lineId: string;
  numSides: number;
  /** map of side -> artwork URL (string) */
  existing?: Record<string, string> | null;
};

type SideState = {
  busy: boolean;
  error: string | null;
};

export default function UploadCta({ lineId, numSides, existing = null }: Props) {
  // single hidden input, reused for any side
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pendingSideRef = React.useRef<number | null>(null);

  // per-side UI state
  const [sidesState, setSidesState] = React.useState<Record<number, SideState>>(() => {
    const init: Record<number, SideState> = {};
    const n = Math.max(1, numSides);
    for (let i = 1; i <= n; i++) init[i] = { busy: false, error: null };
    return init;
  });

  // derived list of sides to render
  const sides = React.useMemo(() => Array.from({ length: Math.max(1, numSides) }, (_, i) => i + 1), [numSides]);

  // get current URL for a side
  const urlForSide = React.useCallback(
    (side: number) => (existing && existing[String(side)]) || null,
    [existing]
  );

  // helpers to set side state
  const setBusy = React.useCallback((side: number, busy: boolean) => {
    setSidesState((prev) => ({ ...prev, [side]: { ...prev[side], busy, error: busy ? null : prev[side]?.error ?? null } }));
  }, []);

  const setError = React.useCallback((side: number, message: string | null) => {
    setSidesState((prev) => ({ ...prev, [side]: { ...prev[side], error: message } }));
  }, []);

  // open picker for a side (Upload or Replace)
  const openPickerForSide = React.useCallback((side: number) => {
    pendingSideRef.current = side;
    fileInputRef.current?.click();
  }, []);

  // central file-change handler for the hidden input
  const onFileChange = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    const side = pendingSideRef.current ?? 1;
    pendingSideRef.current = null;

    if (!file) {
      return;
    }

    await handleUpload(side, file);

    // clear input so picking same file twice still triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // drag & drop support per-tile
  const onDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDropForSide = React.useCallback(async (side: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] ?? null;
    if (!file) {
      return;
    }
    await handleUpload(side, file);
  }, []);

  // remove current artwork for a side
  const removeSide = React.useCallback(async (side: number) => {
    try {
      setBusy(side, true);
      setError(side, null);

      const res = await fetch("/api/cart/artwork", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lineId, side, url: null }), // convention: null clears artwork
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed to remove artwork (side ${side})`);
      }

      // refresh to re-pull cart state (you can swap for useCart().refresh if you prefer)
      location.reload();
    } catch (err: any) {
      setError(side, err?.message ?? "Failed to remove artwork");
    } finally {
      setBusy(side, false);
    }
  }, [lineId, setBusy, setError]);

  // core upload flow (presign → PUT → persist)
  const handleUpload = React.useCallback(async (side: number, file: File) => {
    try {
      setBusy(side, true);
      setError(side, null);

      // 1) presign with your server (Cloudflare R2 presign we added)
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, lineId, side }),
      });

      const presign = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok || !presign?.uploadUrl || !presign?.publicUrl) {
        throw new Error(presign?.error || "Failed to presign upload");
      }

      // 2) PUT the bytes to R2
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }

      // 3) save the public URL for this side on the cart line
      const saveRes = await fetch("/api/cart/artwork", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lineId, side, url: presign.publicUrl }),
      });
      const save = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok || !save?.ok) {
        throw new Error(save?.error || "Failed to save artwork");
      }

      // 4) refresh to re-pull cart with the new thumbnail(s)
      location.reload();
    } catch (err: any) {
      setError(side, err?.message ?? "Upload failed");
    } finally {
      setBusy(side, false);
    }
  }, [lineId, setBusy, setError]);

  return (
    <div className="upload-cta">
      {/* shared hidden input used by all sides */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden-input"
        onChange={onFileChange}
      />

      {sides.map((side) => {
        const url = urlForSide(side);
        const busy = sidesState[side]?.busy;
        const err = sidesState[side]?.error;

        return (
          <div
            key={side}
            className="upload-slot"
            onDragOver={onDragOver}
            onDrop={(e) => onDropForSide(side, e)}
          >
            {/* Thumbnail / Placeholder */}
            {url ? (
              <img
                src={url}
                alt={`Artwork Side ${side}`}
                className="art-thumb"
                loading="lazy"
              />
            ) : (
              <div
                className="art-thumb"
                style={{ display: "grid", placeItems: "center", color: "#9ca3af", textAlign: "center" }}
                aria-label={`No artwork for side ${side}`}
              >
                No art<br/>Side {side}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {!url ? (
                <button
                  className="upload-btn"
                  onClick={() => openPickerForSide(side)}
                  disabled={busy}
                >
                  {busy ? "Uploading…" : "Upload artwork"}
                </button>
              ) : (
                <>
                  <button
                    className="upload-btn"
                    onClick={() => openPickerForSide(side)}
                    disabled={busy}
                    aria-label={`Replace artwork for side ${side}`}
                  >
                    {busy ? "Replacing…" : "Replace"}
                  </button>
                  <button
                    className="upload-btn"
                    onClick={() => removeSide(side)}
                    disabled={busy}
                    aria-label={`Remove artwork for side ${side}`}
                    style={{ background: "#ef4444" }}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>

            {/* Inline error */}
            {err && (
              <div className="muted" style={{ color: "#991b1b", marginTop: 6, maxWidth: 320 }}>
                {err}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
