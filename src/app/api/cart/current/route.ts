// src/app/api/cart/current/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema/cart"; // adjust paths
import { eq } from "drizzle-orm";
import { getCartForSession } from "@/lib/cart";

export async function GET() {
  try {
    const cart = await getCartForSession();
    if (!cart) return NextResponse.json({ ok: true, lines: [], subtotal: 0, itemCount: 0 });

    // Load lines
    const lines = await db
      .select()
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    // Subtotal straight from persisted unitPrice * quantity
    const subtotal = lines.reduce((sum, l: any) => {
      const price = Number(l.unitPrice) || 0;
      const qty = Number(l.quantity) || 1;
      return sum + price * qty;
    }, 0);

    const itemCount = lines.reduce((sum, l: any) => sum + (Number(l.quantity) || 1), 0);

    // Return exactly what the client needs for review UI
    return NextResponse.json({
      ok: true,
      lines: lines.map((l: any) => ({
        id: l.id,
        productId: l.productId,
        optionIds: l.optionIds,              // raw array of option ids
        optionsByGroup: l.optionsByGroup,    // the canonical group->id map from Sinalite
        sinalitePackageInfo: l.sinalitePackageInfo,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice) || 0,
        lineTotal: (Number(l.unitPrice) || 0) * (Number(l.quantity) || 1),
      })),
      subtotal,
      itemCount,
      currency: "USD", // or infer from user/country; shipping estimator already does US/CAD
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load cart" },
      { status: 500 }
    );
  }
}
