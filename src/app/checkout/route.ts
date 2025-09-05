// src/app/checkout/route.ts
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function originFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

// Redirect back to review WITHOUT query params (use hash for UX toast)
function backToReviewWithHash(origin: string, message?: string) {
  const hash = message ? `#checkout_error=${encodeURIComponent(message)}` : "";
  return NextResponse.redirect(`${origin}/cart/review${hash}`, 303);
}

async function createAndRedirect() {
  const h = await headers();
  const origin = originFromHeaders(h);

  // Forward cookies so the API sees the same SID/cart
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), 12_000);

  let res: Response;
  try {
    res = await fetch(`${origin}/api/create-checkout-session`, {
      method: "POST",
      headers: {
        cookie: cookieHeader,
        accept: "application/json",
        "content-type": "application/json",
      },
      cache: "no-store",
      signal: ac.signal,
      redirect: "follow",
    });
  } catch (err: any) {
    console.error("checkout/create session network error:", err);
    clearTimeout(id);
    return backToReviewWithHash(origin, "network_error");
  } finally {
    clearTimeout(id);
  }

  const ct = res.headers.get("content-type") || "";
  let json: any = null;

  if (ct.includes("application/json")) {
    try {
      json = await res.json();
    } catch (err: any) {
      console.warn("checkout/session JSON parse failed:", err);
    }
  } else {
    try {
      const txt = await res.text();
      console.warn("checkout/session non-JSON response:", res.status, txt.slice(0, 500));
    } catch { /* ignore */ }
  }

  if (res.ok && json?.ok && typeof json?.url === "string") {
    return NextResponse.redirect(json.url, 303);
  }

  const reason = json?.error ?? `http_${res.status}`;
  console.warn("checkout/session failure:", { status: res.status, reason });
  return backToReviewWithHash(origin, String(reason || "unknown_error"));
}

export async function GET() { return createAndRedirect(); }
export async function POST() { return createAndRedirect(); }
