import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { orders } from "@/db/schema/orders";
import { cartLines } from "@/db/schema/cartLines";
import { cartArtwork } from "@/db/schema/cartArtwork";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    const jar = await cookies();
    const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

    const [o] = (await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)) ?? [];
    if (!o) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // ownership gate
    if (userId && o.userId === sid) {
      await db.update(orders).set({ userId }).where(eq(orders.id, params.id));
      o.userId = userId;
    }
    if (![userId, sid].filter(Boolean).includes(o.userId)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const lines = await db
      .select({
        id: cartLines.id,
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, o.cartId as string));

    const ids = lines.map((l) => l.id);
    const art = ids.length
      ? await db
          .select({ cartLineId: cartArtwork.cartLineId, url: cartArtwork.url })
          .from(cartArtwork)
          .where(inArray(cartArtwork.cartLineId, ids))
      : [];

    return NextResponse.json({
      ok: true,
      order: o,
      lines,
      artwork: art,
    });
  } catch (e: any) {
    console.error("/api/me/orders/[id] failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
