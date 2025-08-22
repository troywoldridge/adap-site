/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema/cart";
import { cartArtwork } from "@/db/schema/cart-artwork";

async function getSid(): Promise<string> {
  const jar = await cookies();
  let sid = jar.get("sid")?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    jar.set("sid", sid, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return sid;
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ lineId: string }> }
) {
  const { lineId } = await ctx.params;
  if (!lineId) {
    return Response.json({ ok: false, error: "lineId required" }, { status: 400 });
  }

  // Resolve current open cart by SID
  const sid = await getSid();
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.sid, sid), eq(carts.status, "open")),
  });

  if (!cart) {
    return Response.json({ ok: false, error: "no open cart" }, { status: 404 });
  }

  // Ensure the line belongs to this cart
  const line = await db.query.cartLines.findFirst({
    where: and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)),
  });
  if (!line) {
    return Response.json({ ok: false, error: "line not found" }, { status: 404 });
  }

  // Delete any per-side artwork rows then the line itself
  await db
    .delete(cartArtwork)
    .where(eq(cartArtwork.cartLineId, lineId));

  await db
    .delete(cartLines)
    .where(and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)));

  return Response.json({ ok: true, deleted: lineId }, { status: 200 });
}
