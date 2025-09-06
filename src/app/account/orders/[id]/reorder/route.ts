// src/app/account/orders/[id]/reorder/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { orders } from "@/db/schema/orders";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartArtwork } from "@/db/schema/cartArtwork";

export const dynamic = "force-dynamic";

async function ensureSid(): Promise<string> {
  const jar = await cookies();
  let sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? "";
  if (!sid) {
    sid = crypto.randomUUID();
    // Writable cookies in route handlers:
    jar.set({
      name: "adap_sid",
      value: sid,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // secure in prod; localhost often http:
      secure: !((jar.get("host")?.value || "").startsWith("localhost")),
      maxAge: 60 * 60 * 24 * 90,
    });
  }
  return sid;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    const sid = await ensureSid();

    // Load order
    const [o] = (await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)) ?? [];
    if (!o) {
      return NextResponse.redirect(new URL("/account?tab=orders", _req.url));
    }

    // Ownership/claim
    if (userId && o.userId === sid) {
      await db.update(orders).set({ userId }).where(eq(orders.id, params.id));
      (o as any).userId = userId;
    }
    if (![userId, sid].filter(Boolean).includes(o.userId)) {
      return NextResponse.redirect(new URL("/account?tab=orders", _req.url));
    }

    // Find or create open cart for this SID
    let [cart] =
      (await db
        .select()
        .from(carts)
        .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
        .limit(1)) ?? [];

    if (!cart) {
      const [created] = await db
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

    // Copy lines from original cart
    const priorCartId = o.cartId as string | null;
    if (!priorCartId) {
      return NextResponse.redirect(new URL("/cart/review", _req.url));
    }

    const priorLines = await db
      .select({
        id: cartLines.id,
        productId: cartLines.productId,
        quantity: cartLines.quantity,
        unitPriceCents: cartLines.unitPriceCents,
        lineTotalCents: cartLines.lineTotalCents,
        optionIds: cartLines.optionIds,
      })
      .from(cartLines)
      .where(eq(cartLines.cartId, priorCartId));

    // Artwork for prior lines
    const priorIds = priorLines.map((l) => l.id);
    const priorArt =
      priorIds.length > 0
        ? await db
            .select({ cartLineId: cartArtwork.cartLineId, url: cartArtwork.url, side: cartArtwork.side })
            .from(cartArtwork)
            .where(inArray(cartArtwork.cartLineId, priorIds))
        : [];

    // Insert new lines & copy artwork
    await db.transaction(async (tx) => {
      for (const l of priorLines) {
        const [nl] = await tx
          .insert(cartLines)
          .values({
            cartId: cart.id,
            productId: l.productId,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents,
            lineTotalCents: l.lineTotalCents, // server will recompute if you prefer
            optionIds: l.optionIds,
          } as any)
          .returning();

        // copy artwork urls (works whether you store in R2 or Cloudflare Images)
        const artForLine = priorArt.filter((a) => a.cartLineId === l.id);
        if (artForLine.length) {
          await tx.insert(cartArtwork).values(
            artForLine.map((a) => ({
              cartLineId: nl.id,
              url: a.url,
              side: a.side ?? null,
            })) as any
          );
        }
      }
    });

    // Redirect to review
    return NextResponse.redirect(new URL("/cart/review", _req.url), { status: 303 });
  } catch (e) {
    console.error("reorder failed:", e);
    return NextResponse.redirect(new URL("/account?tab=orders", _req.url));
  }
}
