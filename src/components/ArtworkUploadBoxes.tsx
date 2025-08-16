"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

type UploadedPart = { fileName: string; storageId: string };
type CartLine = { lineId: string; quantity: number };

export default function ArtworkUploadBoxes({
  productId,
  numSides,
  cartLines,
}: {
  productId: string | number;
  numSides: number;
  cartLines: CartLine[];
}) {
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

  async function ensureCartLines(): Promise<CartLine[]> {
    if (Array.isArray(cartLines) && cartLines.length > 0) return cartLines;

    const url = new URL("/api/cart/lines/ensure", window.location.origin);
    url.searchParams.set("productId", String(productId));
    url.searchParams.set("qty", "1");

    const r = await fetch(url.toString(), { method: "GET" });
    let j: any = null;
    try {
      j = await r.json();
    } catch {
      /* no-op */
    }
    if (!r.ok || !j?.ok || !Array.isArray(j?.lines) || j.lines.length === 0) {
      throw new Error(j?.error || "Unable to create a cart line for this item.");
    }
    return j.lines as CartLine[];
  }

  async function uploadAll(): Promise<UploadedPart[]> {
    const results: UploadedPart[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f) continue;

      if (f.type.toLowerCase() !== "application/pdf") {
        throw new Error(`"${f.name}" is not a PDF. Please upload PDF files only.`);
      }
      if (f.size && f.size > 100 * 1024 * 1024) {
        throw new Error(`"${f.name}" exceeds 100MB. Please upload a smaller file.`);
      }

      const form = new FormData();
      form.append("file", f);
      form.append("productId", String(productId));
      form.append("side", String(i + 1));

      const resp = await fetch("/api/artwork/upload", { method: "POST", body: form });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Upload failed for "${f.name}".`);
      }
      const data = await resp.json();
      if (!data?.id) throw new Error(`Upload response missing id for "${f.name}".`);

      results.push({ fileName: f.name, storageId: data.id });
    }

    if (results.length === 0) {
      throw new Error("Please choose at least one PDF to upload.");
    }

    return results;
  }

  async function attachToCart(lines: CartLine[], parts: UploadedPart[]) {
    const resp = await fetch("/api/cart/attachments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: Number(productId),
        cartLines: lines,
        parts,
      }),
    });

    const text = await resp.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* no-op */
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

      const lines = await ensureCartLines();
      const parts = await uploadAll();
      await attachToCart(lines, parts);

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
              className="mt-1 block w-full border rounded p-2"
              onChange={(e) => handleFileChange(i, e.target.files?.[0] ?? null)}
            />
            {files[i]?.name ? (
              <span className="mt-1 block text-xs text-gray-600 truncate">{files[i]!.name}</span>
            ) : null}
          </label>
        ))}
      </div>

      {error && <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={uploading || !hasAtLeastOneFile}
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
