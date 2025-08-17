// src/app/api/cart/route.ts
import { NextResponse } from "next/server";
import { getOrSetSid } from "@/lib/sid";
import { getOrCreateOpenCartBySid } from "@/lib/cart";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema/cart";
import { cartArtwork } from "@/db/schema/cart_artwork";
import { eq, inArray } from "drizzle-orm";
import { productImagesForProductId } from "@/lib/product-images";
import { getConfiguredPrice } from "@/lib/sinalite.client";

const STORE = process.env.NEXT_PUBLIC_STORE_CODE || "en_us";
const CURRENCY: "USD" | "CAD" = STORE.toLowerCase().includes("ca") ? "CAD" : "USD";

export async function GET() {
  try {
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

    // Fetch artwork rows for these lines
    const lineIds = lines.map(l => l.id);
    const artRows = lineIds.length
      ? await db.select().from(cartArtwork).where(inArray(cartArtwork.lineId, lineIds))
      : [];

    const artworkByLine = new Map<string, { side: number; url: string }[]>();
    for (const r of artRows) {
      const arr = artworkByLine.get(r.lineId) || [];
      arr.push({ side: r.side, url: r.url });
      artworkByLine.set(r.lineId, arr);
    }

    // Price each line using SinaLite
    let subtotal = 0;

    const items = await Promise.all(
      lines.map(async (l) => {
        const optionIds = (l.optionIds ?? []).map(Number).filter(Number.isFinite);
        let unitPrice: number | null = null;
        try {
          const priced = await getConfiguredPrice(l.productId, optionIds, l.quantity, STORE);
          unitPrice = priced?.unitPrice ?? null;
        } catch {
          unitPrice = null;
        }
        const lineTotal = unitPrice != null ? unitPrice * l.quantity : null;
        if (typeof lineTotal === "number") {
          subtotal += lineTotal;
        }

        // Artwork thumb first, else product image
        const artwork = artworkByLine.get(l.id) || [];
        const thumb = artwork[0]?.url ?? (productImagesForProductId(String(l.productId))[0] || null);

        return {
          id: l.id,
          productId: l.productId,
          name: `Product ${l.productId}`,
          quantity: l.quantity,
          optionIds: optionIds.length ? optionIds : null,
          image: thumb,
          currency: CURRENCY,
          unitPrice,
          lineTotal,
          numSides: Math.max(1, artwork.length || 1),
          artwork, // [{side,url}]
        };
      })
    );

    return NextResponse.json({
      cartId: cart.id,
      currency: CURRENCY,
      items,
      subtotal,
    });
  } catch (e: any) {
    return NextResponse.json(
      { cartId: "", currency: CURRENCY, items: [], subtotal: 0, error: e?.message || "Cart error" },
      { status: 500 }
    );
  }
}
