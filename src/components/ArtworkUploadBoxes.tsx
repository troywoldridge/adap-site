"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

type UploadedPart = { fileName: string; storageId: string };
type CartLine = { id: string; quantity?: number };

type Props = {
  productId: string | number;
  numSides: number;
  /** Optional: existing cart lines for this product (if you already fetched them) */
  cartLines?: Array<{ id: string }>;
  /** Optional: lineId for the exact line added from “Add & Upload” flow */
  lineId?: string;
  /** Optional: called after files successfully attached */
  onVerified?: (fileCount: number) => void;
};

export default function ArtworkUploadBoxes({
  productId,
  numSides,
  cartLines = [],
  lineId,
  onVerified,
}: Props) {
  const [files, setFiles] = useState<(File | null)[]>(Array(numSides).fill(null));
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { isSignedIn } = useAuth();

  const hasAtLeastOneFile = useMemo(() => files.some(Boolean), [files]);

  function handleFileChange(i: number, f: File | null) {
    const next = files.slice();
    next[i] = f;
    setFiles(next);
    setDone(false);
    setError(null);
  }

  /**
   * Prefer explicit lineId -> provided cartLines -> ensure endpoint.
   * Our ensure endpoint returns: { ok: true, lineId, quantity }
   */
  async function resolveTargetLines(): Promise<CartLine[]> {
    if (lineId) return [{ id: lineId, quantity: 1 }];
    if (Array.isArray(cartLines) && cartLines.length > 0) {
      return cartLines.map((l) => ({ id: l.id, quantity: 1 }));
    }

    const url = new URL("/api/cart/lines/ensure", window.location.origin);
    url.searchParams.set("productId", String(productId));
    url.searchParams.set("qty", "1");

    const r = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      credentials: "include", // ← keep SID cookie
    });

    let j: any = null;
    try {
      j = await r.json();
    } catch {
      // ignore
    }

    // Support both shapes just in case:
    //  A) { ok, lineId, quantity }
    //  B) { ok, lines: [{id, quantity}] }
    if (r.ok && j?.ok) {
      if (j.lineId) return [{ id: j.lineId, quantity: j.quantity ?? 1 }];
      if (Array.isArray(j.lines) && j.lines.length > 0) return j.lines as CartLine[];
    }

    throw new Error(j?.error || `Unable to create a cart line for this item (status ${r.status}).`);
  }

  /** Upload a single file to R2 (or Cloudflare Images) via your presign route. */
  async function uploadOne(f: File, targetLineId?: string): Promise<UploadedPart> {
    const name = f.name || "upload";
    const type = (f.type || "application/octet-stream").toLowerCase();

    // PDFs only (adjust if you want to allow image formats)
    if (type !== "application/pdf") {
      throw new Error(`"${name}" is not a PDF. Please upload PDF files only.`);
    }
    if (f.size && f.size > 100 * 1024 * 1024) {
      throw new Error(`"${name}" exceeds 100MB. Please upload a smaller file.`);
    }

    // Ask server for signed upload URL (to R2 or Cloudflare Images Direct Upload)
    const presign = await fetch("/api/uploads/r2", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        filename: name,
        contentType: type,
        lineId: targetLineId ?? null,
      }),
    });

    const presignJson = await presign.json().catch(() => ({}));
    if (!presign.ok || !presignJson?.ok || !presignJson?.uploadUrl) {
      throw new Error(presignJson?.error || "Failed to create upload URL.");
    }

    const { uploadUrl, publicUrl } = presignJson as { uploadUrl: string; publicUrl: string };

    // PUT the file to the signed URL
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": type },
      body: f,
    });
    if (!putRes.ok) {
      const txt = await putRes.text().catch(() => "");
      throw new Error(`Upload failed: ${txt.slice(0, 200)}`);
    }

    // Store publicUrl as storageId (for display / later rendering)
    // If you’re using Cloudflare Images, this should be the imagedelivery URL:
    // https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>
    return { fileName: name, storageId: publicUrl };
  }

  /** Upload all selected files (to the first target line for now). */
  async function uploadAll(targetLines: CartLine[]): Promise<UploadedPart[]> {
    const results: UploadedPart[] = [];
    const target = targetLines[0]?.id || undefined;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f) continue;
      const part = await uploadOne(f, target);
      results.push(part);
    }

    if (results.length === 0) {
      throw new Error("Please choose at least one PDF to upload.");
    }

    return results;
  }

  /** Save attachments onto the server-side cart line(s). */
  async function attachToCart(lines: CartLine[], parts: UploadedPart[]) {
    const resp = await fetch("/api/cart/attachments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      credentials: "include",
      body: JSON.stringify({
        productId: Number(productId),
        cartLines: lines.map((l) => ({ id: l.id, quantity: l.quantity ?? 1 })),
        parts,
      }),
    });

    const text = await resp.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    if (!resp.ok || !json?.ok) {
      throw new Error(json?.error || text || "Failed to save attachments.");
    }
  }

  async function onContinue() {
    if (uploading) return;
    if (!hasAtLeastOneFile) {
      setError("Please add at least one PDF before continuing.");
      return;
    }

    try {
      setError(null);
      setUploading(true);

      const lines = await resolveTargetLines();
      const parts = await uploadAll(lines);
      await attachToCart(lines, parts);

      // Broadcast success for the continue gate
      try {
        window.dispatchEvent(
          new CustomEvent("adap:artworkUploaded", { detail: { ok: true, count: parts.length } })
        );
      } catch {}

      onVerified?.(parts.length);
      setDone(true);
      setUploading(false);

      if (!isSignedIn) {
        const redirectUrl = encodeURIComponent("/cart/review");
        router.push(`/sign-in?redirect_url=${redirectUrl}`);
        return;
      }
      router.push("/cart/review");
    } catch (e: any) {
      setUploading(false);
      setError(e?.message || "Upload failed.");
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Upload Artwork</h3>
      <p className="text-sm text-gray-600">
        Upload your print-ready PDF files. We’ll attach them to your order and show them on the review page.
      </p>

      <div className="grid gap-3">
        {Array.from({ length: numSides }).map((_, i) => (
          <label key={i} className="block">
            <span className="text-sm font-medium">Side {i + 1}</span>
            <input
              type="file"
              accept="application/pdf"
              className="mt-1 block w-full rounded border p-2"
              onChange={(e) => handleFileChange(i, e.target.files?.[0] ?? null)}
            />
            {files[i]?.name ? (
              <span className="mt-1 block truncate text-xs text-gray-600">{files[i]!.name}</span>
            ) : null}
          </label>
        ))}
      </div>

      {error && <div className="whitespace-pre-wrap text-sm text-red-600">{error}</div>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={uploading || !hasAtLeastOneFile}
          onClick={onContinue}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {uploading ? "Processing…" : "Go to review order"}
        </button>
        {done && <span className="text-sm text-green-700">Artwork saved to your cart.</span>}
      </div>
    </div>
  );
}
