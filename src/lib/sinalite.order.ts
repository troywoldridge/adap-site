import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

const BASE = "https://api.sinaliteuppy.com";

export async function placeSinaliteOrder(orderData: any): Promise<{ orderId: number; message: string; status: string }> {
  const token = await getSinaliteAccessToken();
  const res = await fetch(`${BASE}/order/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(orderData),
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Sinalite order failed: ${res.status} ${res.statusText} ${txt}`);
  }
  return res.json();
}
