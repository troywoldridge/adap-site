// src/lib/shippingChoice.ts
export type ShippingChoice = {
  country: "US" | "CA";
  state: string;
  zip: string;
  carrier: string;
  method: string;
  cost: number;
  days: number | null;
  currency: "USD" | "CAD";
};
export function saveShipChoice(choice: ShippingChoice) {
  try {
    const key = `ADAP_SHIP_${choice.country}_${choice.state}_${choice.zip}`;
    localStorage.setItem(key, JSON.stringify(choice));
  } catch {}
}
export function readAnyShipChoice(): ShippingChoice | null {
  try {
    // simple: grab first ADAP_SHIP_* found
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (k.startsWith("ADAP_SHIP_")) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const v = JSON.parse(raw);
        if (v && v.carrier && v.method && typeof v.cost === "number") return v;
      }
    }
  } catch {}
  return null;
}
export async function flushShipChoiceToCart() {
  const picked = readAnyShipChoice();
  if (!picked) return;
  await fetch("/api/cart/shipping/choose", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(picked),
  }).catch(() => {});
}
