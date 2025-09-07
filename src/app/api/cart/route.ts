// src/app/api/cart/route.ts
import "server-only";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  // Prefer env for PROD, but in dev use the incoming request’s origin
  const envOrigin =
    process.env.PUBLIC_APP_ORIGIN ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "";

  // For local/dev, req.nextUrl.origin will be http://localhost:3000 (or your LAN IP)
  const origin = envOrigin || req.nextUrl.origin;

  // Build target URL safely
  const target = new URL("/api/cart/current", origin).toString();

  // Add a short timeout so we don't hang if something goes sideways
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);

  try {
    const res = await fetch(target, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: ac.signal,
    });

    const ct = res.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      const json = await res.json();
      return Response.json(json, {
        status: res.status,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Not JSON? Stream it through as-is.
    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });
  } catch (err) {
    // Fallback: try a guaranteed local origin to help during dev
    try {
      const localUrl = new URL("/api/cart/current", "http://127.0.0.1:3000").toString();
      const res = await fetch(localUrl, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const json = await res.json();
      return Response.json(json, {
        status: res.status,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (e2) {
      const msg =
        err instanceof Error ? err.message : typeof err === "string" ? err : "fetch failed";
      return Response.json({ ok: false, error: msg }, { status: 502 });
    }
  } finally {
    clearTimeout(t);
  }
}
