// src/app/product/[productId]/upload-artwork/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import ArtworkUploadBoxes from "@/components/ArtworkUploadBoxes";
import { getOrderSession, getOrderSessionById } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { productId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

function readParam(sp: PageProps["searchParams"], key: string): string | undefined {
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : v;
}

function getBaseUrlFromHeaders(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  if (!host) {
    // Safe fallback for local dev
    return process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  }
  return `${proto}://${host}`;
}

export default async function UploadArtworkPage({ params, searchParams }: PageProps) {
  const productId = params.productId;

  // 1) Try cookie session first
  let order = await getOrderSession();

  // 2) Try query (?orderSessionId= or legacy ?orderId=)
  if (!order) {
    const qp = readParam(searchParams, "orderSessionId") || readParam(searchParams, "orderId");
    if (qp) {
      order = await getOrderSessionById(qp);
    }
  }

  // 3) Ensure session via API (route handler sets cookie – allowed)
  if (!order) {
    const base = getBaseUrlFromHeaders();
    const res = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
      cache: "no-store",
    });

    const ctype = res.headers.get("content-type") || "";
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to ensure session (${res.status} ${res.statusText}): ${txt.slice(0, 200)}`);
    }
    if (!ctype.includes("application/json")) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Expected JSON from /api/sessions, got: ${ctype}\n${txt.slice(0, 200)}`);
    }

    const j = await res.json();
    order = j?.session ?? null;
  }

  if (!order) {
    return (
      <main className="container" style={{ padding: 24 }}>
        <h1>No order in progress</h1>
        <p className="muted">We couldn’t create or find an order session.</p>
        <p><Link href={`/product/${productId}`} className="btn btn-primary">Back to product</Link></p>
      </main>
    );
  }

  // Read ?sides=
  const sidesParam = readParam(searchParams, "sides");
  const numSides = sidesParam ? Number(sidesParam) || 2 : 2;

  return (
    <main className="container" style={{ padding: 24 }}>
      <h1>Upload Artwork</h1>
      <p className="muted" style={{ marginBottom: 12 }}>
        Upload your print-ready files. We’ll attach them to your order and show them on the review page.
      </p>

      <ArtworkUploadBoxes
        productId={String(productId)}
        numSides={numSides}
        orderSessionId={order.id}
      />

      <div style={{ marginTop: 16 }}>
        <Link href={`/review-order`} className="btn btn-secondary">
          Go to Review Order
        </Link>
      </div>
    </main>
  );
}
