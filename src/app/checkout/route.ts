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

async function createAndRedirect() {
  const h = await headers();
  const origin = originFromHeaders(h);

  // Forward the user's cookies so the API sees the same SID/cart
  const jar = await cookies();
  const cookieHeader = jar.getAll().map(c => `${c.name}=${c.value}`).join("; ");

  const res = await fetch(`${origin}/api/create-checkout-session`, {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      accept: "application/json",
      "content-type": "application/json",
    },
    cache: "no-store",
  });

  let json: any;
  try {
    json = await res.json();
  } catch {
    return NextResponse.redirect(`${origin}/cart/review?error=bad_session_response`, 302);
  }

  if (!res.ok || !json?.ok || !json?.url) {
    const reason = encodeURIComponent(json?.error ?? `http_${res.status}`);
    return NextResponse.redirect(`${origin}/cart/review?error=${reason}`, 302);
  }

  // 🚀 send them to Stripe
  return NextResponse.redirect(json.url, 303);
}

export async function GET() {
  return createAndRedirect();
}
export async function POST() {
  return createAndRedirect();
}
