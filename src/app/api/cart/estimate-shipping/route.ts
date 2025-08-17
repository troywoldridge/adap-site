// src/app/api/cart/estimate-shipping/route.ts
import { NextResponse } from "next/server";
import { getOrSetSid } from "@/lib/sid";
import { getOrCreateOpenCartBySid } from "@/lib/cart";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";
import { eq } from "drizzle-orm";
import { estimateShipping } from "@/lib/sinalite.client"; // single-product helper we already wrote

export async function POST(req: Request) {
  try {
    const { country, state, zip } = await req.json() as { country: "US" | "CA"; state: string; zip: string };
    if (!country || !state || !zip) {
      return NextResponse.json({ ok: false, error: "Missing destination" }, { status: 400 });
    }

    const sid = getOrSetSid();
    const cart = await getOrCreateOpenCartBySid(sid);

    const lines = await db
      .select({ productId: cartLines.productId, quantity: cartLines.quantity, optionIds: cartLines.optionIds })
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    // Call SinaLite for each item; merge the cheapest method across items by (carrier+method)
    const methodMap = new Map<string, { carrier: string; method: string; price: number; days: number }>();

    for (const l of lines) {
      const optionIds = (l.optionIds ?? []).map(Number).filter(Number.isFinite);
      const itemRates = await estimateShipping({
        productId: Number(l.productId),
        optionIds,
        shipCountry: country,
        shipState: state,
        shipZip: zip,
      });

      for (const r of itemRates) {
        const key = `${r.carrier}::${r.method}`;
        const existing = methodMap.get(key);
        const ext = { ...r }; // price for ONE of this product
        ext.price *= l.quantity; // multiply by qty in cart
        if (!existing) {
          methodMap.set(key, ext);
        } else {
                  // Sum prices; take max days as conservative ETA
                  existing.price += ext.price;
                  existing.days = Math.max(existing.days, ext.days);
                }
      }
    }

    const rates = Array.from(methodMap.values()).sort((a, b) => a.price - b.price);
    const cheapest = rates[0] || null;

    return NextResponse.json({ ok: true, rates, cheapest });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Estimate failed" }, { status: 500 });
  }
}
