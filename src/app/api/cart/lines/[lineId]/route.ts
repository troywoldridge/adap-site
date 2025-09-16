// src/app/api/cart/lines/[lineId]/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";

// Keep Node runtime + force-dynamic so cookies/headers/params can be awaited safely
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/cart/lines/[lineId]
 * Removes a single line item from the user's open cart.
 *
 * Notes:
 * - In Next.js 15, dynamic route `params` must be awaited when using dynamic APIs.
 * - We validate the line belongs to the user's open cart before deleting.
 * - Returns 200 with a minimal payload describing what happened.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ lineId: string }> } // 👈 params is async in v15 dynamic APIs
) {
  try {
    const { lineId } = await ctx.params; // ✅ await params before destructuring

    if (!lineId || typeof lineId !== "string") {
      return NextResponse.json({ error: "Missing or invalid lineId" }, { status: 400 });
    }

    // 1) Find the line and its cart to ensure it exists
    const [line] = await db
      .select({
        id: cartLines.id,
        cartId: cartLines.cartId,
      })
      .from(cartLines)
      .where(eq(cartLines.id, lineId))
      .limit(1);

    if (!line) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    // 2) Ensure the cart is open before modifying (defensive)
    const [cart] = await db
      .select({
        id: carts.id,
        status: carts.status,
      })
      .from(carts)
      .where(and(eq(carts.id, line.cartId), eq(carts.status, "open")))
      .limit(1);

    if (!cart) {
      return NextResponse.json({ error: "Cart is not open or not found" }, { status: 409 });
    }

    // 3) Delete the line
    const [deleted] = await db
      .delete(cartLines)
      .where(eq(cartLines.id, lineId))
      .returning({
        id: cartLines.id,
        cartId: cartLines.cartId,
      });

    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete line" }, { status: 500 });
    }

    // 4) (Optional) If you keep computed totals, do them elsewhere or here if needed.
    //    Many apps simply re-fetch /api/cart after this call.

    return NextResponse.json(
      {
        ok: true,
        removedLineId: deleted.id,
        cartId: deleted.cartId,
        message: "Cart line removed",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/cart/lines/[lineId] failed:", err);
    return NextResponse.json(
      { error: "Unexpected error while removing line" },
      { status: 500 }
    );
  }
}
