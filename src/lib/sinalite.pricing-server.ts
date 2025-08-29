// lib/sinalite.pricing-server.ts
import "server-only";
import { currencyToStoreCode } from "./sinaliteStore";
import { getSinaliteBearer } from "@/lib/sinalite.server";

const API_BASE =
  process.env.SINALITE_API_BASE ?? "https://api.sinaliteuppy.com";

type PriceResponse = {
  price?: string | number;
  productOptions?: Record<string, string>;
};

export async function priceLineServer(
  productId: number,
  optionIds: number[],
  currency: "USD" | "CAD"
): Promise<{ unitPriceCents: number; optionsByGroup: Record<string, string> }> {
  const storeCode = currencyToStoreCode(currency);
  const token = await getSinaliteBearer();
  const url = `${API_BASE}/price/${productId}/${storeCode}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: token,
      "content-type": "application/json",
    },
    body: JSON.stringify({ productOptions: optionIds.map(String) }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sinalite price ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as PriceResponse;
  const p = Number(data?.price);
  const unitPriceCents = Number.isFinite(p) ? Math.round(p * 100) : 0;
  const optionsByGroup = (data?.productOptions ?? {}) as Record<string, string>;

  return { unitPriceCents, optionsByGroup };
}

/* ─────────────────────────────────────────────────────────────────────────────
   OPTIONAL: shipping estimate helper you can reuse in your API routes
   Maps directly to /order/shippingEstimate (Sinalite docs).
   Usage in a route: const rates = await estimateShippingServer(dest, items)
────────────────────────────────────────────────────────────────────────────── */

export type EstimateItem = { productId: number; optionIds: number[] };
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
  if (!items?.length) throw new Error("No shippable items.");

  const token = await getSinaliteBearer();

  const payload = {
    items: items.map((it) => ({
      productId: it.productId,
      options: it.optionIds.map(String),
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
    const text = await res.text();
    throw new Error(`Sinalite estimate ${res.status}: ${text.slice(0, 300)}`);
  }

  // per docs: body: [carrier, method, price, days][]
  const json = (await res.json()) as {
    statusCode: number;
    body: [string, string, number, number][];
  };

  const currency: "USD" | "CAD" = dest.country === "US" ? "USD" : "CAD";

  return (json.body ?? []).map(([carrier, method, price, days]) => ({
    carrier,
    serviceCode: method,
    serviceName: method,
    amount: Number(price) || 0,
    currency,
    eta: Number.isFinite(days)
      ? `${days} business day${Number(days) === 1 ? "" : "s"}`
      : null,
    days: Number.isFinite(days) ? Number(days) : null,
  }));
}
