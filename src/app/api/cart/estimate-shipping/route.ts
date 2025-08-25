/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextRequest } from "next/server";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";
import { valueIdToGroupKey } from "@/lib/sinaliteOptionMap";

type LineIn = { productId: number; optionIds: number[] };
type BodyIn = {
  shipCountry?: string;
  shipState?: string;
  shipZip?: string | number;
  items?: LineIn[];
  store?: "US" | "CA" | "USD" | "CAD";
};

const upper = (s: unknown) => String(s ?? "").trim().toUpperCase();
const asZip = (u: unknown) => String(u ?? "").trim();

function normStore(s: unknown): "US" | "CA" {
  const v = String(s || "US").toUpperCase();
  return v === "CA" || v === "CAD" ? "CA" : "US";
}

// detect a qty valueId by looking for a group that canonicalizes to 'qty'
async function findQtyId(productId: number, optionIds: number[]): Promise<number | null> {
  const v2g = await valueIdToGroupKey(productId);
  for (const id of optionIds) {
    const g = v2g[id];
    if (!g) continue;
    if (g.toLowerCase() === "qty" || g.toLowerCase() === "quantity") {
      return id;
    }
  }
  return null;
}

// Convert optionIds[] -> { options: { group: "valueIdAsString" } }
async function idsToOptions(
  productId: number,
  optionIds: number[],
): Promise<Record<string, string>> {
  const v2g = await valueIdToGroupKey(productId);
  const out: Record<string, string> = {};
  for (const id of optionIds) {
    const key = v2g[id];
    if (!key) continue;
    out[key] = String(id); // SinaLite expects stringified value IDs
  }
  return out;
}

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as BodyIn;

    const store = normStore(body.store);
    const ShipCountry = upper(body.shipCountry);
    const ShipState = upper(body.shipState);
    const ShipZip = asZip(body.shipZip);

    if (!ShipCountry || !ShipState || !ShipZip) {
      return Response.json(
        { ok: false, error: "country, state/province and postal/zip are required" },
        { status: 400 },
      );
    }

    const rawLines = Array.isArray(body.items) ? body.items : [];
    const lines = rawLines
      .map((l) => ({
        productId: Number(l?.productId),
        optionIds: Array.isArray(l?.optionIds) ? l.optionIds.map(Number).filter(Number.isFinite) : [],
      }))
      .filter((l) => Number.isFinite(l.productId) && l.optionIds.length > 0) as LineIn[];

    if (!lines.length) {
      return Response.json(
        { ok: false, error: "No shippable items (missing productId/optionIds[])." },
        { status: 400 },
      );
    }

    // Build items payload with robust qty handling
    const items: Array<{ productId: number; options: Record<string, string> }> = [];
    for (const l of lines) {
      let options = await idsToOptions(l.productId, l.optionIds);

      // Safety net: ensure a qty is present
      const hasQty = Object.keys(options).some((k) => k.toLowerCase() === "qty" || k.toLowerCase() === "quantity");
      if (!hasQty) {
        const maybeQtyId = await findQtyId(l.productId, l.optionIds);
        if (maybeQtyId != null) {
          options = { ...options, qty: String(maybeQtyId) };
        }
      }

      if (Object.keys(options).length === 0) {
        return Response.json(
          {
            ok: false,
            error:
              "Missing required options for pricing/estimate (make sure all groups — including Qty — are selected).",
            detail: { productId: l.productId, optionIds: l.optionIds, store },
          },
          { status: 400 },
        );
      }

      items.push({ productId: l.productId, options });
    }

    // 🔗 SinaLite API call (per docs)
    const bearer = await getSinaliteAccessToken();
    const base = process.env.SINALITE_BASE_URL || "https://liveapi.sinalite.com";
    const url = `${base}/order/shippingEstimate`;

    const payload = {
      items,
      shippingInfo: { ShipState, ShipZip, ShipCountry },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: bearer, // "Bearer <token>"
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}

    if (!res.ok) {
      return Response.json(
        { ok: false, error: `SinaLite estimate failed (${res.status})`, detail: json ?? text?.slice(0, 4000) ?? null },
        { status: res.status },
      );
    }

    // Docs: { statusCode: 200, body: [ ["UPS","UPS Standard", 9.1, 1], ... ] }
    const arr: any[] = Array.isArray(json?.body) ? json.body : Array.isArray(json) ? json : [];
    const currency: "USD" | "CAD" = store === "CA" ? "CAD" : "USD";

    const rates = arr
      .map((r) => {
        if (!Array.isArray(r) || r.length < 3) return null;
        const [carrier, method, price, days] = r;
        const cost = Number(price);
        const etaDays = Number(days);
        if (!Number.isFinite(cost)) return null;
        return {
          carrier: String(carrier ?? ""),
          method: String(method ?? ""),
          cost,
          days: Number.isFinite(etaDays) ? etaDays : null,
          currency,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.cost - b!.cost) as Array<{
        carrier: string;
        method: string;
        cost: number;
        days: number | null;
        currency: "USD" | "CAD";
      }>;

    return Response.json({ ok: true, rates });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: "Shipping estimate route crashed", detail: String(err?.message || err) },
      { status: 502 },
    );
  }
}
