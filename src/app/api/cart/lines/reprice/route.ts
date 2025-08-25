import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cartLines, carts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { priceSinaliteProduct } from "@/lib/sinalite.pricing";
import { storeToSinaStoreCode } from "@/lib/storeCodes";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { cartId } = (await req.json().catch(() => ({}))) as { cartId?: string };
    if (!cartId) return Response.json({ ok: false, error: "cartId required" }, { status: 400 });

    const cart = await db.query.carts.findFirst({ where: eq(carts.id, cartId) });
    if (!cart) return Response.json({ ok: false, error: "cart not found" }, { status: 404 });

    const lines = await db.query.cartLines.findMany({ where: eq(cartLines.cartId, cartId) });
    const store = cart.currency === "CAD" ? "CA" : "US";

    for (const l of lines) {
      const priced = await priceSinaliteProduct({
        productId: Number(l.productId),
        optionIds: Array.isArray(l.optionIds) ? l.optionIds.map(Number) : [],
        store,
      });
      const unitCents = Math.round(priced.unitPrice * 100);
      const lineTotalCents = unitCents * (Number(l.quantity) || 1);

      await db
        .update(cartLines)
        .set({
          unitPriceCents: unitCents,
          lineTotalCents,
          currency: cart.currency,
          optionsByGroup: priced.pricingMeta?.productOptions as any,
          pricingMeta: priced.pricingMeta as any,
        })
        .where(eq(cartLines.id, l.id));
    }

    return Response.json({ ok: true, count: lines.length });
  } catch (err: any) {
    return Response.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
