// src/lib/uploadArtwork.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

export type PresignResponse =
  | { url: string; headers?: Record<string, string>; publicUrl: string }
  | { putUrl: string; headers?: Record<string, string>; publicUrl: string };

type AttachArtworkResponse = { ok: boolean; error?: string };

function getFileExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export async function presignUpload(opts: {
  filename: string;
  contentType: string;
  prefix?: string; // e.g. "artwork/{sid}/{lineId}"
}): Promise<PresignResponse> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: opts.filename,
      contentType: opts.contentType,
      prefix: opts.prefix ?? undefined,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`presign failed: ${res.status} ${msg}`);
  }
  return (await res.json()) as PresignResponse;
}

export async function uploadToR2(putUrl: string, file: File, headers?: Record<string, string>) {
  const res = await fetch(putUrl, {
    method: "PUT",
    headers: {
      "content-type": file.type || "application/octet-stream",
      ...(headers ?? {}),
    },
    body: file,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`R2 upload failed: ${res.status} ${msg}`);
  }
}

export async function attachArtworkToLine(lineId: string, side: number | string, publicUrl: string) {
  const res = await fetch(`/api/cart/lines/${encodeURIComponent(lineId)}/artwork`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ side: String(side), url: publicUrl }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as AttachArtworkResponse;
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `attach artwork failed: ${res.status}`);
  }
}

/**
 * High-level helper: presign → PUT to R2 → attach to cart line.
 * Returns the public R2 URL you can show as the artwork thumbnail.
 */
export async function uploadArtwork(params: {
  lineId: string;
  side: number | string;
  file: File;
  sid?: string; // optional session id; server can infer if omitted
}) {
  const { lineId, side, file, sid } = params;

  const prefix = sid ? `artwork/${sid}/${lineId}` : `artwork/${lineId}`;
  const presigned = await presignUpload({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    prefix,
  });

  const putUrl = (presigned as any).putUrl || (presigned as any).url;
  if (!putUrl) {
    throw new Error("presign response missing putUrl/url");
  }

  await uploadToR2(putUrl, file, (presigned as any).headers);
  await attachArtworkToLine(lineId, side, (presigned as any).publicUrl);

  return { publicUrl: (presigned as any).publicUrl };
}
