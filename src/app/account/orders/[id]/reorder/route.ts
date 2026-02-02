// src/app/account/orders/[id]/reorder/route.ts
import "server-only";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema/orders";
import { carts } from "@/lib/db/schema/cart";
import { cartLines } from "@/lib/db/schema/cartLines";
import { cartArtwork } from "@/lib/db/schema/cartArtwork";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderRow = typeof orders.$inferSelect;
type CartRow = typeof carts.$inferSelect;
type CartInsert = typeof carts.$inferInsert;
type CartLineRow = typeof cartLines.$inferSelect;
type CartLineInsert = typeof cartLines.$inferInsert;
type CartArtworkRow = typeof cartArtwork.$inferSelect;
type CartArtworkInsert = typeof cartArtwork.$inferInsert;

async function ensureSid(): Promise<string> {
  const jar = await cookies();
  let sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? "";

  if (!sid) {
    sid = randomUUID();
    jar.set("adap_sid", sid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 90,
    });
  }

  return sid;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    const sid = await ensureSid();

    const { select, insert, update, transaction } = db;

    const o =
      ((await select().from(orders).where(eq(orders.id, params.id)).limit(1))?.[0] as OrderRow | undefined) ??
      null;

    if (!o) {
      return NextResponse.redirect(new URL("/account?tab=orders", _req.url));
    }

    // Guest → user claim
    if (userId && String((o as any).userId) === String(sid)) {
      await update(orders).set({ userId }).where(eq(orders.id, params.id));
    }

    const claimants = [userId, sid].filter((v): v is string => Boolean(v));
    if (!claimants.includes(String((o as any).userId))) {
      return NextResponse.redirect(new URL("/account?tab=orders", _req.url));
    }

    // Find or create open cart for this SID
    let cart =
      ((await select()
        .from(carts)
        .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
        .limit(1))?.[0] as CartRow | undefined) ?? undefined;

    if (!cart) {
      const currency: "USD" | "CAD" = (o as any).currency === "CAD" ? "CAD" : "USD";
      const toInsert: CartInsert = {
        sid,
        status: "open" as any,
        currency,
        selectedShipping: null as unknown as CartInsert["selectedShipping"],
      };
      cart = ((await insert(carts).values(toInsert).returning())?.[0] as CartRow | undefined) ?? undefined;
    }

    if (!cart) {
      return NextResponse.redirect(new URL("/cart/review", _req.url));
    }

    const priorCartId = ((o as any).cartId as string | null) ?? null;
    if (!priorCartId) {
      return NextResponse.redirect(new URL("/cart/review", _req.url));
    }

    const priorLines = (await select({
      id: cartLines.id,
      productId: cartLines.productId,
      quantity: cartLines.quantity,
      unitPriceCents: cartLines.unitPriceCents,
      lineTotalCents: cartLines.lineTotalCents,
      optionIds: cartLines.optionIds,
      cartId: cartLines.cartId,
    })
      .from(cartLines)
      .where(eq(cartLines.cartId, priorCartId))) as Array<
      Pick<CartLineRow, "id" | "productId" | "quantity" | "unitPriceCents" | "lineTotalCents" | "optionIds" | "cartId">
    >;

    const priorIds = priorLines.map((l) => l.id);

    const priorArt: Array<Pick<CartArtworkRow, "cartLineId" | "url" | "side">> =
      priorIds.length > 0
        ? ((await select({
            cartLineId: cartArtwork.cartLineId,
            url: cartArtwork.url,
            side: cartArtwork.side,
          })
            .from(cartArtwork)
            .where(inArray(cartArtwork.cartLineId, priorIds))) as Array<
            Pick<CartArtworkRow, "cartLineId" | "url" | "side">
          >)
        : [];

    await transaction(async (tx: any) => {
      for (const l of priorLines) {
        const newLine: CartLineInsert = {
          cartId: cart!.id,
          productId: l.productId,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          lineTotalCents: l.lineTotalCents,
          optionIds: l.optionIds,
        };

        const nl = (await tx.insert(cartLines).values(newLine).returning())?.[0] as CartLineRow | undefined;
        if (!nl) continue;

        const artForLine = priorArt.filter((a) => a.cartLineId === l.id);
        if (artForLine.length) {
          const artInserts: CartArtworkInsert[] = artForLine.map((a) => ({
            cartLineId: nl.id,
            url: a.url,
            side: a.side ?? null,
          }));
          await tx.insert(cartArtwork).values(artInserts);
        }
      }
    });

    return NextResponse.redirect(new URL("/cart/review", _req.url), { status: 303 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorder failed:", msg);
    return NextResponse.redirect(new URL("/account?tab=orders", _req.url));
  }
}
