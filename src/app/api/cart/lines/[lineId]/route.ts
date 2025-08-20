// src/app/api/cart/lines/[lineId]/route.ts
import { NextRequest } from "next/server";
import { getCartServer, setCartServer } from "@/lib/cartSession";

export async function PATCH(req: NextRequest, { params }: { params: { lineId: string } }) {
  const { lineId } = params;
  const body = await req.json();
  const qtyN = body?.quantity;
  const optionIds = body?.optionIds;

  const cart = getCartServer();
  const line = cart.lines.find(l => l.id === lineId);
  if (!line) return Response.json({ ok: false, error: "Not found" }, { status: 404 });

  if (qtyN !== undefined) {
    const q = Number(qtyN);
    if (!Number.isFinite(q) || q < 1) return Response.json({ ok: false, error: "Bad quantity" }, { status: 400 });
    line.quantity = Math.min(9999, q);
  }
  if (Array.isArray(optionIds)) {
    line.optionIds = optionIds.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n));
  }

  setCartServer(cart);
  return Response.json({ ok: true, cart, line });
}
