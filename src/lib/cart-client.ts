// src/lib/cart-client.ts
export type CartShape = {
  id: string | null;
  lines: any[];
  subtotal: number;
  lineCount: number;
};

export async function getCart(): Promise<CartShape> {
  const endpoints = ["/api/cart/current", "/api/cart"];
  for (const url of endpoints) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) {
        continue;
      }
      const j = await r.json();
      const cart = j?.cart ?? {};
      return {
        id: cart.id ?? null,
        lines: Array.isArray(cart.lines) ? cart.lines : [],
        subtotal: Number(cart.subtotal ?? 0),
        lineCount: Number(cart.lineCount ?? (Array.isArray(cart.lines) ? cart.lines.length : 0)),
      };
    } catch {
      // try next endpoint
    }
  }
  return { id: null, lines: [], subtotal: 0, lineCount: 0 };
}
