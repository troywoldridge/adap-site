// src/lib/uploadArtwork.ts
export type PresignResponse = {
  uploadUrl: string;
  key: string;
  publicUrl: string; // e.g. https://cdn.adap.com/artwork/artwork/<orderId>/...
};

/**
 * Ask our server to create a presigned PUT URL for R2.
 * This never exposes your R2 secrets to the browser.
 */
export async function getPresignedUrl(params: {
  filename: string;
  contentType: string;
  orderId: string | number;
}): Promise<PresignResponse> {
  const res = await fetch("/api/r2/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Presign failed: ${res.status} ${body}`);
  }
  return res.json();
}

/**
 * Upload the File to the presigned URL.
 * The object is written straight to Cloudflare R2 via S3 PUT.
 */
export async function uploadToPresignedUrl(uploadUrl: string, file: File) {
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) {
    const msg = await put.text().catch(() => "");
    throw new Error(`Upload failed: ${put.status} ${msg}`);
  }
}

/**
 * Optional small sanitizer if you need it client-side too.
 */
export function safeFilename(name: string) {
  return (name || "").replace(/[^\w.\-]+/g, "_").slice(0, 200);
}
