import "server-only";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { and, eq, ne } from "drizzle-orm";

import { dbClient as db } from "@/lib/db";
import { orders } from "@/db/schema/orders";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartArtwork } from "@/db/schema/cartArtwork";

export const dynamic = "force-dynamic";

type LineOverride = {
  productId: number;
  quantity: number;
  unitPriceCents?: number | null;
};

async function ensureSid(): Promise<string> {
  const jar = await cookies();
  let sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? "";

  if (!sid) {
    sid = crypto.randomUUID();
    jar.set({
      name: "adap_sid",
      value: sid,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 90,
    });
  }
  return sid;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const database = db;
    const { userId } = await auth();
    const sid = await ensureSid();

    const [o] = await database
      .select()
      .from(orders)
      .where(eq(orders.id, params.id))
      .limit(1);

    if (!o) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    if (userId && o.userId === sid) {
      await database
        .update(orders)
        .set({ userId })
        .where(eq(orders.id, params.id));
      (o as any).userId = userId;
    }

    if (![userId, sid].filter(Boolean).includes(o.userId)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as { lines: LineOverride[] };
    const overrides = (body?.lines || []).filter((l) => Number(l.quantity) > 0);

    let [cart] = await database
      .select()
      .from(carts)
      .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
      .limit(1);

    if (!cart) {
      const [created] = await database
        .insert(carts)
        .values({
          sid,
          status: "open",
          currency: (o.currency as any) || "USD",
          selectedShipping: null,
        } as any)
        .returning();
      cart = created;
    }

    if (!overrides.length && o.cartId) {
      const prior = await database
        .select()
        .from(cartLines)
        .where(eq(cartLines.cartId, o.cartId as string));

      await database.transaction(async (tx) => {
        for (const l of prior) {
          const [nl] = await tx
            .insert(cartLines)
            .values({
              cartId: cart.id,
              productId: l.productId,
              quantity: l.quantity,
              unitPriceCents: l.unitPriceCents,
              lineTotalCents: l.lineTotalCents,
              optionIds: l.optionIds,
            } as any)
            .returning();

          const arts = await tx
            .select({ url: cartArtwork.url, side: cartArtwork.side })
            .from(cartArtwork)
            .where(eq(cartArtwork.cartLineId, l.id));

          if (arts.length) {
            await tx.insert(cartArtwork).values(
              arts.map((a) => ({
                cartLineId: nl.id,
                url: a.url,
                side: a.side ?? null,
              })) as any,
            );
          }
        }
      });
    } else {
      await database.transaction(async (tx) => {
        for (const l of overrides) {
          await tx.insert(cartLines).values({
            cartId: cart.id,
            productId: l.productId,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents ?? null,
            lineTotalCents: null,
          } as any);
        }
      });
    }

    return NextResponse.json({ ok: true, goto: "/cart/review" });
  } catch (e: any) {
    console.error("reorder POST failed", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 },
    );
  }
}
