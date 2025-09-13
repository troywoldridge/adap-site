import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type TokenCache = { token: string; exp: number } | null;
let tokenCache: TokenCache = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.exp > now + 10_000) return tokenCache.token;

  const client_id = process.env.SINALITE_CLIENT_ID!;
  const client_secret = process.env.SINALITE_CLIENT_SECRET!;
  if (!client_id || !client_secret) {
    throw new Error("Missing SINALITE_CLIENT_ID / SINALITE_CLIENT_SECRET");
  }

  const res = await fetch("https://api.sinaliteuppy.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id,
      client_secret,
      audience: "https://apiconnect.sinalite.com",
      grant_type: "client_credentials",
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    throw new Error(`Auth failed (${res.status})`);
  }

  const ttlSec = typeof json.expires_in === "number" ? Math.min(3600, json.expires_in) : 1200; // <= 60m default ~20m
  tokenCache = { token: String(json.access_token), exp: Date.now() + ttlSec * 1000 };
  return tokenCache.token;
}

/** try very hard to pull a numeric price from any payload */
function firstPriceNumber(input: any): number | null {
  if (input == null) return null;
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const m = input.match(/-?\d+(?:\.\d+)?/);
    if (m) return Number(m[0]);
    return null;
  }
  if (Array.isArray(input)) {
    for (const v of input) {
      const n = firstPriceNumber(v);
      if (n != null) return n;
    }
    return null;
  }
  if (typeof input === "object") {
    // check common keys first
    const preferred = ["price","unitPrice","unit","amount","subtotal","total","basePrice","value","Price","UnitPrice","Amount","Total"];
    for (const k of preferred) {
      if (k in input) {
        const n = firstPriceNumber((input as any)[k]);
        if (n != null) return n;
      }
    }
    // otherwise scan everything
    for (const k of Object.keys(input)) {
      const n = firstPriceNumber((input as any)[k]);
      if (n != null) return n;
    }
  }
  return null;
}

/**
 * POST /api/price
 * body: { productId: number, store: "US"|"CA", options?: (number|string)[], selections?: Record<string, number|string> }
 * returns: { ok: true, unitPrice: number, currency: "USD"|"CAD", raw?: any }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const productId = Number(body?.productId);
    const store: "US" | "CA" = String(body?.store || "US").toUpperCase() === "CA" ? "CA" : "US";

    let optionIds: number[] = [];
    if (Array.isArray(body?.options)) {
      optionIds = (body.options as any[]).map(Number).filter((n) => Number.isFinite(n) && n > 0);
    } else if (body?.selections && typeof body.selections === "object") {
      optionIds = Object.values(body.selections).map((v: any) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
    }

    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ ok: false, error: "invalid_productId" }, { status: 400 });
    }
    if (optionIds.length === 0) {
      return NextResponse.json({ ok: false, error: "missing_option_ids" }, { status: 400 });
    }

    const token = await getAccessToken();
    const url = `https://liveapi.sinalite.com/price/${productId}/${store}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ options: optionIds }),
    });

    const text = await resp.text();
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch { /* keep as string */ }

    if (!resp.ok) {
      const msg = (payload && (payload.error || payload.message)) || text || `Price API failed (${resp.status})`;
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }

    const found = firstPriceNumber(payload);
    if (found == null || !Number.isFinite(found)) {
      // expose payload in dev to help inspect shape
      return NextResponse.json(
        { ok: false, error: "invalid_price_in_response", raw: process.env.NODE_ENV !== "production" ? payload : undefined },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      unitPrice: Number(found),
      currency: store === "CA" ? "CAD" : "USD",
      raw: process.env.NODE_ENV !== "production" ? payload : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
