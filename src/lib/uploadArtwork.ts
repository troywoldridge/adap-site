export async function getPresignedUrl(args: {
  filename: string;
  contentType: string;
  orderSessionId?: string;
  orderId?: number | string;
  productId?: number | string;
  sideIndex?: number;
}) {
  const res = await fetch("/api/r2/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Presign failed: ${res.status} ${res.statusText} ${t}`);
  }
  return res.json() as Promise<{
    uploadUrl: string;
    publicUrl: string;
    storageKey: string;
    bucket: string;
  }>;
}

export async function uploadToPresignedUrl(url: string, file: File) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${res.statusText} ${t}`);
  }
}

export async function attachArtworkToOrder(args: {
  orderSessionId: string;
  productId: number | string;
  files: {
    publicUrl: string;
    filename: string;
    contentType: string;
    storageKey: string;
    bucket: string;
    sideIndex?: number;
  }[];
  orderId?: number | string | null;
  orderItemId?: number | string | null;
  sinaliteJobId?: string | null;
}) {
  const res = await fetch("/api/orders/attach-artwork", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Attach failed: ${res.status} ${res.statusText} ${t}`);
  }
  return res.json() as Promise<any>;
}

