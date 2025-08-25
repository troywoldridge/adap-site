// lib/sinalite.pricing-server.ts
import { currencyToStoreCode, storeToCurrency } from "./sinaliteStore";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

const BASE = process.env.SINALITE_BASE_URL ?? "https://liveapi.sinalite.com";

export async function priceLineServer(
  productId: number,
  optionIds: number[],
  currency: "USD" | "CAD"
): Promise<{ unitPriceCents: number; optionsByGroup: Record<string,string> }> {
  const storeCode = currencyToStoreCode(currency);
  const token = await getSinaliteAccessToken();
  const url = `${BASE}/price/${productId}/${storeCode}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: token, "content-type": "application/json" },
    body: JSON.stringify({ productOptions: optionIds.map(String) }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`SinaLite price failed ${res.status}`);
  const data = await res.json();
  const priceNum = Number(data?.price ?? 0);
  const unitPriceCents = Math.round(priceNum * 100);
  const optionsByGroup = (data?.productOptions ?? {}) as Record<string, string>;
  return { unitPriceCents, optionsByGroup };
}
