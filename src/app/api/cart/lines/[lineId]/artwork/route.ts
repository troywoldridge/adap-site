/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { db } from "@/lib/db";

import { cartArtwork } from "@/db/schema/cartArtwork";

function getSid(): string | null {
  return cookies().get("sid")?.value ?? null;
}

export async function POST(req: NextRequest, { params }: { params: { lineId: string } }) {
  try {
    const { lineId } = params;
    const { side, url } = (await req.json()) as { side?: number; url: string };

    if (!url) return Response.json({ ok: false, error: "url required" }, { status: 400 });

    const sid = getSid();
    if (!sid) return Response.json({ ok: false, error: "no session" }, { status: 401 });

    const cart = await db.query.carts.findFirst({ where: and(eq(carts.sid, sid), eq(carts.status, "open")) });
    if (!cart) return Response.json({ ok: false, error: "cart not found" }, { status: 404 });

    const line = await db.query.cartLines.findFirst({
      where: and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)),
    });
    if (!line) return Response.json({ ok: false, error: "line not found" }, { status: 404 });

    const s = Number.isFinite(Number(side)) && Number(side) > 0 ? Number(side) : 1;

    // Upsert (simple: delete then insert for (lineId, side))
    await db.delete(cartArtwork).where(and(eq(cartArtwork.cartLineId, lineId), eq(cartArtwork.side, s)));
    await db.insert(cartArtwork).values({ cartLineId: lineId, side: s, url });

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message ?? "artwork save error" }, { status: 500 });
  }
}
