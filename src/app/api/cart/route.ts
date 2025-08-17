// src/app/api/cart/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { carts, cartLines } from "@/db/schema/cart";
import { getOrCreateOpenCartBySid } from "@/lib/cart";
import { getOrSetSid } from "@/lib/sid";

const STORE = process.env.NEXT_PUBLIC_STORE_CODE || "en_us";
const CURRENCY: "USD" | "CAD" = STORE.toLowerCase().includes("ca") ? "CAD" : "USD";

export async function GET() {
  try {
    // IMPORTANT: use the same sid logic as /api/cart/add
    const sid = getOrSetSid();
    const cart = await getOrCreateOpenCartBySid(sid);

    const lines = await db
      .select({
        id: cartLines.id,
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        optionIds: cartLines.optionIds,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    // You can decorate with names/images by joining your local JSON/CDN mapping
    // For now, return minimal but consistent shape.
    const items = lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      name: `Product ${l.productId}`,
      quantity: l.quantity,
      optionIds: l.optionIds ?? null,
      image: null,
      currency: CURRENCY,
      unitPrice: null,
      lineTotal: null,
      numSides: null,
      artwork: [],
    }));

    // If you want a quick subtotal even without SinaLite prices, keep 0 for now.
    const subtotal = 0;

    return NextResponse.json({
      cartId: cart.id,
      currency: CURRENCY,
      items,
      subtotal,
    });
  } catch (e: any) {
    // ALWAYS reply JSON to avoid “Unexpected end of JSON input”
    return NextResponse.json(
      { cartId: "", currency: CURRENCY, items: [], subtotal: 0, error: e?.message || "Cart error" },
      { status: 500 },
    );
  }
}
