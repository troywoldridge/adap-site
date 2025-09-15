// src/app/api/cart/lines/reprice/route.ts
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cartLines, carts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { priceSinaliteProduct } from "@/lib/sinalite.pricing";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { cartId } = (await req.json().catch(() => ({}))) as { cartId?: string };
    if (!cartId) {
      return Response.json({ ok: false, error: "cartId required" }, { status: 400 });
    }

    const cart = await db.query.carts.findFirst({ where: eq(carts.id, cartId) });
    if (!cart) {
      return Response.json({ ok: false, error: "cart not found" }, { status: 404 });
    }

    const lines = await db.query.cartLines.findMany({ where: eq(cartLines.cartId, cartId) });
    const store = cart.currency === "CAD" ? "CA" : "US";

    for (const l of lines) {
      const qty = Math.max(1, Number(l.quantity) || 1);

      const priced = await priceSinaliteProduct({
        productId: Number(l.productId),
        optionIds: Array.isArray(l.optionIds) ? l.optionIds.map(Number) : [],
        store,
      });

      // SinaLite /price returns TOTAL for the selected combo (Quantity is part of options).
      const total =
        Number((priced as any)?.lineTotal) ||
        Number((priced as any)?.total) ||
        Number((priced as any)?.price) ||
        Number((priced as any)?.unitPrice) || // legacy mislabel
        0;

      const lineTotalCents = Number.isFinite(total) && total > 0 ? Math.round(total * 100) : 0;
      const unitPriceCents =
        lineTotalCents > 0 ? Math.round(lineTotalCents / Math.max(1, qty)) : 0;

      // Only set columns that exist on cartLines in your schema
      await db
        .update(cartLines)
        .set({
          unitPriceCents,
          lineTotalCents, // already the full total from SinaLite — do not multiply by qty again
          // NOTE: intentionally NOT setting optionsByGroup because this column doesn't exist here
          // If you have a JSONB meta column, we keep it below:
          pricingMeta: (priced as any)?.pricingMeta ?? undefined,
        })
        .where(eq(cartLines.id, l.id));
    }

    return Response.json({ ok: true, count: lines.length });
  } catch (err: any) {
    return Response.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
