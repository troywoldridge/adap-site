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

type OrderRow = typeof orders.$inferSelect;
type CartRow = typeof carts.$inferSelect;
type CartInsert = typeof carts.$inferInsert;
type CartLineRow = typeof cartLines.$inferSelect;
type CartLineInsert = typeof cartLines.$inferInsert;
type CartArtworkRow = typeof cartArtwork.$inferSelect;
type CartArtworkInsert = typeof cartArtwork.$inferInsert;

async function ensureSid(): Promise<string> {
  // `cookies()` is sync in route handlers
  const jar = cookies();
  let sid = (await jar).get("adap_sid")?.value ?? (await jar).get("sid")?.value ?? "";
  if (!sid) {
    sid = crypto.randomUUID();
    (await jar).set("adap_sid", sid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 90, // 90 days
    });
  }
  return sid;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    const sid = await ensureSid();

    // Load order
    const [o] = (await db
      .select()
      .from(orders)
      .where(eq(orders.id, params.id))
      .limit(1)) as OrderRow[]; // widen type explicitly
    if (!o) {
      return NextResponse.redirect(new URL("/account?tab=orders", _req.url));
    }

    // Ownership/claim
    if (userId && o.userId === sid) {
      await db.update(orders).set({ userId }).where(eq(orders.id, params.id));
      // no need to mutate `o` for auth checks below, we'll re-compute claimants
    }
    const claimants = [userId, sid].filter((v): v is string => Boolean(v));
    if (!claimants.includes(o.userId)) {
      return NextResponse.redirect(new URL("/account?tab=orders", _req.url));
    }

    // Find or create open cart for this SID
    let [cart] =
      (await db
        .select()
        .from(carts)
        .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
        .limit(1)) as CartRow[] | [];

    if (!cart) {
      const currency: "USD" | "CAD" = o.currency === "CAD" ? "CAD" : "USD";
      const toInsert: CartInsert = {
        // required fields for your schema:
        sid,
        status: "open",
        currency,
        // whatever your schema uses for selectedShipping (likely jsonb | null)
        selectedShipping: null as unknown as CartInsert["selectedShipping"],
      };
      const [created] = (await db.insert(carts).values(toInsert).returning()) as CartRow[];
      cart = created;
    }

    // Copy lines from original cart
    const priorCartId = o.cartId as CartLineRow["cartId"] | null;
    if (!priorCartId) {
      return NextResponse.redirect(new URL("/cart/review", _req.url));
    }

    const priorLines = (await db
      .select({
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
      Pick<
        CartLineRow,
        "id" | "productId" | "quantity" | "unitPriceCents" | "lineTotalCents" | "optionIds" | "cartId"
      >
    >;

    // Artwork for prior lines
    const priorIds = priorLines.map((l) => l.id);
    const priorArt: Array<Pick<CartArtworkRow, "cartLineId" | "url" | "side">> =
      priorIds.length > 0
        ? ((await db
            .select({ cartLineId: cartArtwork.cartLineId, url: cartArtwork.url, side: cartArtwork.side })
            .from(cartArtwork)
            .where(inArray(cartArtwork.cartLineId, priorIds))) as Array<
            Pick<CartArtworkRow, "cartLineId" | "url" | "side">
          >)
        : [];

    // Insert new lines & copy artwork
    await db.transaction(async (tx) => {
      for (const l of priorLines) {
        const newLine: CartLineInsert = {
          cartId: cart.id,
          productId: l.productId,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          lineTotalCents: l.lineTotalCents, // server can recompute if desired
          optionIds: l.optionIds,
        };
        const [nl] = (await tx.insert(cartLines).values(newLine).returning()) as CartLineRow[];

        // copy artwork urls (supports R2 or Cloudflare Images references)
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

    // Redirect to review
    return NextResponse.redirect(new URL("/cart/review", _req.url), { status: 303 });
  } catch (e: unknown) {
    // keep user flow resilient; log server-side
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reorder failed:", msg);
    return NextResponse.redirect(new URL("/account?tab=orders", _req.url));
  }
}
