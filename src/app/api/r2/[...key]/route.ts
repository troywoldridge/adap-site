// src/app/api/r2/[...key]/route.ts
import { NextResponse } from "next/server";

const BASE = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");

// Dynamic catch-all API route: /api/r2/[...key]
export async function GET(
  req: Request,
  context: { params: { key: string[] } }
) {
  if (!BASE) {
    return new NextResponse("R2_PUBLIC_BASE_URL not set", { status: 500 });
  }

  // Join key segments like /foo/bar.png
  const key = context.params.key.join("/");

  // Build upstream URL
  const upstream = `${BASE}/${encodeURIComponent(key)}`.replace(/%2F/g, "/");

  // Proxy the request to R2
  const res = await fetch(upstream, { cache: "no-store" });

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "content-type":
        res.headers.get("content-type") || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
