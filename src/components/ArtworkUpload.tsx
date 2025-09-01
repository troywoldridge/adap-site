"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";


export type ArtworkFile = {
  type: "front" | "back" | "other";
  url: string;
  key: string;
  name: string;
  isImage: boolean;
  side: number;
};

type UploadResult = {
  ok: boolean;
  error?: string;
  uploadUrl?: string;
  publicUrl?: string; // Cloudflare R2 public (CDN) URL
  key?: string;
};

function xhrUploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      onProgress(Math.max(1, Math.min(99, pct)));
    };
    xhr.onload = () => {
      onProgress(100);
      resolve(new Response(xhr.response, { status: xhr.status, statusText: xhr.statusText }));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(file);
  });
}

function extBadge(name: string) {
  const m = name.match(/\.([a-z0-9]+)$/i);
  return (m?.[1] || "").toUpperCase();
}

export default function ArtworkUpload({
  cartId,
  lineId,
  onUploaded,
  label = "Choose File",
  side = 1,
  accept = ".pdf,.ai,.eps,.png,.jpg,.jpeg,.tif,.tiff",
  className = "",
}: {
  cartId?: string;
  lineId: string;
  onUploaded?: (file: ArtworkFile | null) => void; // null = removed
  label?: string;
  side?: number; // 1=front, 2=back, etc.
  accept?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [preview, setPreview] = useState<ArtworkFile | null>(null);
  const [over, setOver] = useState(false);

  const sideType: ArtworkFile["type"] = useMemo(() => {
    if (side === 1) return "front";
    if (side === 2) return "back";
    return "other";
  }, [side]);

  const pick = useCallback(() => inputRef.current?.click(), []);

  const handleFiles = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      setProgress(0);
      try {
        // 1) Presign to R2 (Cloudflare) — we’ll get PUT URL + public CDN URL
        const presign: UploadResult = await fetch("/api/uploads/r2", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            cartId,
            lineId,
          }),
        }).then((r) => r.json());

        if (!presign?.ok || !presign.uploadUrl || !presign.publicUrl || !presign.key) {
          throw new Error(presign?.error || "Failed to presign");
        }

        // 2) PUT directly to R2 with progress (no server hop)
        const put = await xhrUploadWithProgress(presign.uploadUrl, file, (pct) => setProgress(pct));
        if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

        const isImage = (file.type || "").startsWith("image/");

        // 3) Persist URL to the cart line (per Sinalite flow, we store external URL)
        const save = await fetch(`/api/cart/lines/${lineId}/artwork`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ side, url: presign.publicUrl }),
          cache: "no-store",
        }).then((r) => r.json());
        if (!save?.ok) throw new Error(save?.error || "Failed to save artwork");

        // 4) Local preview + notify
        const fileRec: ArtworkFile = {
          type: sideType,
          url: presign.publicUrl, // served via Cloudflare CDN
          key: presign.key,
          name: file.name,
          isImage,
          side,
        };
        setPreview(fileRec);
        onUploaded?.(fileRec);
      } catch (err: any) {
        setError(err?.message ?? "Upload error");
      } finally {
        setBusy(false);
        setTimeout(() => setProgress(0), 600);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [cartId, lineId, side, sideType, onUploaded]
  );

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFiles(f);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFiles(f);
  }

  function onRemove() {
    // Optional: attempt server delete (best-effort)
    fetch(`/api/cart/lines/${lineId}/artwork`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ side, key: preview?.key }),
    }).catch(() => {});
    setPreview(null);
    onUploaded?.(null);
  }

  return (
  <div className={className}>
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      className="hidden"
      onChange={onChange}
    />

    {/* Preview state */}
    {preview ? (
      <div className="grid grid-cols-[120px_1fr] items-center gap-4">
        <div className="relative w-[120px] h-[90px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
          {preview.isImage ? (
            <Image
              src={preview.url}
              alt={preview.name}
              fill
              unoptimized
              sizes="240px"
              className="object-cover"
            />
          ) : (
            <div className="grid place-items-center w-full h-full font-extrabold text-slate-800 bg-indigo-100 tracking-wider">
              {extBadge(preview.name)}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="font-semibold text-slate-900 break-words">{preview.name}</div>
          <div className="flex gap-2">
            <button
              onClick={pick}
              disabled={busy}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              Replace
            </button>
            <button
              onClick={onRemove}
              disabled={busy}
              className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    ) : (
      // Dropzone
      <div
        role="button"
        tabIndex={0}
        onClick={pick}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? pick() : null)}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={[
          "relative grid place-items-center min-h-[160px] rounded-xl border-2 border-dashed transition",
          over ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100",
          busy ? "opacity-75 pointer-events-none" : "",
        ].join(" ")}
        aria-label={label}
      >
        <div className="text-center p-4">
          <div className="font-bold text-slate-900">{busy ? "Uploading…" : label}</div>
          <div className="mt-1 text-sm text-slate-600">Drag & drop files or click to browse</div>
          <div className="mt-0.5 text-xs text-slate-500">PDF, AI, EPS, PNG, JPG, TIFF</div>
        </div>

        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-[width] duration-200 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    )}

    {/* Error */}
    {error && (
      <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        {error}
      </div>
    )}

    {/* Helpful footer row: always visible */}
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Link
        href="/guides"
        className="text-sm font-semibold text-blue-700 underline-offset-2 hover:underline"
        prefetch={false}
      >
        Setup guides & templates →
      </Link>
      <span className="text-xs text-slate-500">
        Accepted: PDF, AI, EPS, PNG, JPG, TIFF • Served via Cloudflare R2/CDN
      </span>
    </div>
  </div>
);
}
