// src/lib/sinalite.pricing-server.ts
import "server-only";
import { getSinaliteBearer } from "@/lib/sinalite.server";

const API_BASE = process.env.SINALITE_API_BASE ?? "https://api.sinaliteuppy.com";

export type EstimateItem = {
  productId: number;
  optionIds: number[];
  quantity?: number;
};

export type EstimateDest = { country: "US" | "CA"; state: string; zip: string };

export type ShippingRate = {
  carrier: string;
  serviceCode: string;
  serviceName: string;
  amount: number;
  currency: "USD" | "CAD";
  eta?: string | null;
  days?: number | null;
};

export async function estimateShippingServer(
  dest: EstimateDest,
  items: EstimateItem[]
): Promise<ShippingRate[]> {
  if (!Array.isArray(items) || items.length === 0) return [];

  const token = await getSinaliteBearer();
  const payload = {
    items: items.map((it) => ({
      productId: it.productId,
      options: (it.optionIds || []).map(String),
      ...(Number.isFinite(it.quantity) ? { quantity: Number(it.quantity) } : {}),
    })),
    shippingInfo: {
      ShipCountry: dest.country,
      ShipState: dest.state,
      ShipZip: dest.zip,
    },
  };

  const res = await fetch(`${API_BASE}/order/shippingEstimate`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: token },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SinaLite estimate ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    statusCode: number;
    body: [string, string, number | string, number | string | null][];
  };

  const currency: "USD" | "CAD" = dest.country === "US" ? "USD" : "CAD";

  return (json.body || []).map(([carrier, method, price, days]) => ({
    carrier,
    serviceCode: String(method),
    serviceName: String(method),
    amount: Number(price) || 0,
    currency,
    eta:
      days == null || days === ""
        ? null
        : `${Number(days)} business day${Number(days) === 1 ? "" : "s"}`,
    days: Number.isFinite(Number(days)) ? Number(days) : null,
  }));
}
