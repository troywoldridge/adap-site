import type { SinaliteShippingEstimateRequest, SinaliteShippingMethod } from "@/types/shipping";

const API_URL = process.env.SINALITE_API_BASE_URL || "https://liveapi.sinalite.com/order/shippingEstimate";

export async function getShippingEstimate(
  orderData: SinaliteShippingEstimateRequest,
  accessToken: string
): Promise<SinaliteShippingMethod[]> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
    body: JSON.stringify(orderData),
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Shipping estimate failed: ${res.statusText}`);
  }
  const json = await res.json();

  if (!json.body || !Array.isArray(json.body)) {
    throw new Error("Shipping estimate: Malformed response");
  }

  return json.body.map((item: [string, string, number, number]) => ({
    carrier: item[0],
    service: item[1],
    price: item[2],
    available: !!item[3]
  }));
}
