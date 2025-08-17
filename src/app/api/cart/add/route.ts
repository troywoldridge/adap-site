// src/app/api/cart/add/route.ts
import { NextResponse } from "next/server";
import { getOrCreateOpenCartBySid, addOrMergeLine } from "@/lib/cart";
import { getOrSetSid } from "@/lib/sid";

type Body = {
  productId: number;
  qty?: number;
  optionIdsByGroup?: Record<string, string | number>;
  optionIds?: Array<string | number>;
  price?: number;
  currency?: string;
};

export async function POST(req: Request) {
  try {
    const sid = getOrSetSid();
    const body = (await req.json()) as Body;

    const cart = await getOrCreateOpenCartBySid(sid);

    // Minimal: store optionIds if supplied, else null (you can resolve by group later)
    // src/app/api/cart/add/route.ts  (only the inner part changes)
    let optionIds: number[] | null = null;

    if (Array.isArray(body.optionIds) && body.optionIds.length) {
      optionIds = body.optionIds.map(Number).filter(Number.isFinite);
    } else if (body.optionIdsByGroup && typeof body.optionIdsByGroup === "object") {
      optionIds = Object.values(body.optionIdsByGroup)
        .map((v) => Number(v))
        .filter(Number.isFinite);
    }


    const { line, merged } = await addOrMergeLine({
      cartId: cart.id,
      productId: Number(body.productId),
      optionIds,
      quantity: Math.max(1, Number(body.qty ?? 1)),
    });

    return NextResponse.json({ ok: true, merged, line, cartId: cart.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Add to cart failed" }, { status: 500 });
  }
}
