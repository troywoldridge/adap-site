import type { NextRequest } from "next/server";

const API_BASE = process.env.SINALITE_API_BASE ?? "https://api.sinaliteuppy.com";
const CLIENT_ID = process.env.SINALITE_CLIENT_ID!;
const CLIENT_SECRET = process.env.SINALITE_CLIENT_SECRET!;

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
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Sinalite auth failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return `${j.token_type} ${j.access_token}`;
}

export async function POST(req: NextRequest) {
  try {
    const { shipCountry, shipState, shipZip, items } = await req.json();

    if (!shipCountry || !shipState || !shipZip || !Array.isArray(items) || items.length === 0) {
      return Response.json({ ok: false, error: "shipCountry, shipState, shipZip, items[] required" }, { status: 400 });
    }

    // Build the order payload exactly like Sinalite expects (per your docs).
    const orderData = {
      items: items.map((it: any) => ({
        productId: Number(it.productId),
        options: (it.optionIds || []).map((x: any) => Number(x)),
        files: [],         // not required for estimate
        // quantity is embedded in options in Sinalite; no separate qty field
      })),
      shippingInfo: {
        ShipCountry: String(shipCountry).toUpperCase(),
        ShipState: String(shipState).toUpperCase(),
        ShipZip: String(shipZip),
      },
    };

    const token = await getAccessToken();

    const r = await fetch(`${API_BASE}/order/shippingEstimate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: token,
      },
      body: JSON.stringify(orderData),
      cache: "no-store",
    });

    if (!r.ok) {
      const t = await r.text();
      return Response.json({ ok: false, error: `Sinalite shippingEstimate failed: ${r.status} ${t}` }, { status: 502 });
    }

    const reply = await r.json();
    // Docs show a shape like: { statusCode: 200, body: [ ["UPS","UPS Standard",10.29,1], ... ] }
    const rows = Array.isArray(reply?.body) ? reply.body : Array.isArray(reply) ? reply : [];
    const rates = rows.map((row: any[]) => ({
      carrier: String(row?.[0] ?? ""),
      method: String(row?.[1] ?? ""),
      price: Number(row?.[2] ?? 0),
      days: row?.[3] ?? null,
    }));

    return Response.json({ ok: true, rates });
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
