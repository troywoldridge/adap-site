// src/app/checkout/page.tsx
import "server-only";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function originFromHeaders(h: Headers) {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function CheckoutPage() {
  const h = await headers();
  const origin = originFromHeaders(h);

  // Forward cookies so the API sees the same session/SID
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const res = await fetch(`${origin}/api/create-checkout-session`, {
    method: "POST",
    headers: { cookie: cookieHeader, accept: "application/json" },
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { ok: false, error: await res.text() };

  if (res.ok && data?.ok && data?.url) {
    redirect(data.url as string); // ⟵ straight into Stripe
  }

  // Fallback: send back to review with an error flag
  redirect("/cart/review?checkout=failed");
}
