import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { estimateShippingServer } from "@/lib/sinalite.pricing-server"; // per SinaLite docs

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BodyLines = { productId: number; optionIds: number[]; quantity?: number }[];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      country?: "US" | "CA";
      state?: string;
      zip?: string;
      lines?: BodyLines;
    };

    const country = body.country === "CA" ? "CA" : "US";
    const state = String(body.state ?? "").trim();
    const zip = String(body.zip ?? "").trim();

    if (!state || !zip) {
      return NextResponse.json({ ok: false, error: "country, state, zip required" }, { status: 400 });
    }

    // 1) Prefer explicit lines from client (CartPageClient/CartSummary).
    let items =
      Array.isArray(body.lines) && body.lines.length
        ? body.lines.map((l) => ({
            productId: Number(l.productId),
            optionIds: Array.isArray(l.optionIds) ? l.optionIds.map(Number) : [],
          }))
        : null;

    // 2) Fallback: read the cart by sid cookie.
    if (!items) {
      const jar = await cookies();
      const sid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value ?? "";
      if (!sid) return NextResponse.json({ ok: false, error: "No cart session" }, { status: 400 });

      const [cart] =
        (await db
          .select({ id: carts.id })
          .from(carts)
          .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
          .limit(1)) ?? [];

      if (!cart) return NextResponse.json({ ok: false, error: "Cart not found" }, { status: 404 });

      const rows = await db
        .select({ productId: cartLines.productId, optionIds: cartLines.optionIds })
        .from(cartLines)
        .where(eq(cartLines.cartId, cart.id));

      items = (rows || []).map((r) => ({
        productId: Number(r.productId),
        optionIds: Array.isArray(r.optionIds) ? r.optionIds.map(Number) : [],
      }));
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ ok: false, error: "No shippable items" }, { status: 400 });
    }

    // 🔊 Debug: prove we are calling SinaLite
    console.log("[shipping/estimate] Calling SinaLite with:", {
      dest: { country, state, zip },
      itemsCount: items.length,
      firstItem: items[0],
    });

    // 3) SinaLite call (per documentation): /order/shippingEstimate
    const rates = await estimateShippingServer(
      { country, state, zip },
      items,
    );

    console.log("[shipping/estimate] SinaLite returned", rates.length, "rates");

    return NextResponse.json({ ok: true, rates });
  } catch (err: any) {
    console.error("[shipping/estimate] ERROR:", err?.message || err);
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
