// src/app/api/sinalite/price/[productId]/route.ts
import type { NextRequest } from "next/server";

const API_BASE = process.env.SINALITE_API_BASE ?? "https://api.sinaliteuppy.com"; // sandbox by default
const CLIENT_ID = process.env.SINALITE_CLIENT_ID!;
const CLIENT_SECRET = process.env.SINALITE_CLIENT_SECRET!;

// We support both numeric (6|9) and locale ("en_ca"|"en_us") store codes.
// Prefer numeric (per your project): 6=CA, 9=US.
function normalizeStoreCode(input?: string | null): string {
  if (!input) return (process.env.SINALITE_DEFAULT_STORE_CODE ?? "9"); // default US
  const s = input.toLowerCase();
  if (s === "us") return "9";
  if (s === "ca") return "6";
  if (s === "en_us" || s === "en-ca" || s === "en_ca") return s.replace("-", "_");
  // already numeric or something else
  return input;
}

async function getAccessToken() {
  const r = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: "https://apiconnect.sinalite.com",
      grant_type: "client_credentials",
    }),
    // no-cache—token TTL is short anyway
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Sinalite auth failed: ${r.status} ${t}`);
  }
  const json = await r.json();
  // json = { access_token, token_type }
  return `${json.token_type} ${json.access_token}`;
}

export async function POST(req: NextRequest, ctx: { params: { productId: string } }) {
  try {
    const { productId } = ctx.params;
    const body = await req.json().catch(() => ({}));
    const optionIds: number[] = body?.productOptions ?? body?.optionIds ?? [];
    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return Response.json({ ok: false, error: "Missing productOptions (array of option IDs)" }, { status: 400 });
    }

    // Store code may come in query (?store=US|CA|9|6|en_ca|en_us)
    const storeParam = req.nextUrl.searchParams.get("store");
    const storeCode = normalizeStoreCode(storeParam);

    const token = await getAccessToken();

    // Endpoint accepts both numeric store (6|9) or locale ("en_ca"/"en_us") depending on environment.
    // We'll call with what we computed:
    const priceUrl = `${API_BASE}/price/${encodeURIComponent(productId)}/${encodeURIComponent(storeCode)}`;

    const r = await fetch(priceUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: token,
      },
      body: JSON.stringify({ productOptions: optionIds }),
    });

    if (!r.ok) {
      const t = await r.text();
      return Response.json({ ok: false, error: `Sinalite price failed: ${r.status} ${t}` }, { status: 502 });
    }

    const data = await r.json();
    // Expected: { price: "5.28", packageInfo: {...}, productOptions: {...} }
    return Response.json({ ok: true, data });
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
