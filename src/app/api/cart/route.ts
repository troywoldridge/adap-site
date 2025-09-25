// src/app/api/cart/route.ts
import "server-only";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const envOrigin =
    process.env.PUBLIC_APP_ORIGIN ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "";
  const origin = envOrigin || req.nextUrl.origin;
  const target = new URL("/api/cart/current", origin).toString();

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

    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });
  } catch (err) {
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
