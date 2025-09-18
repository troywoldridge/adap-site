// src/app/api/cart/lines/[lineId]/artwork/route.ts
import "server-only";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartArtwork } from "@/db/schema/cartArtwork";
import { r2PublicUrl } from "@/lib/r2Public"; // builds https://uploads.adapnow.com/<key>

/** Next 15: cookies() is async-ish; always await. */
async function getSid(): Promise<string | null> {
  const jar = await cookies();
  return jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ lineId: string }> } // ✅ params is a Promise in Next 15
) {
  try {
    const { lineId } = await ctx.params; // ✅ await params
    const body = (await req.json()) as { side?: number; url?: string };

    if (!body?.url || typeof body.url !== "string") {
      return Response.json({ ok: false, error: "url required" }, { status: 400 });
    }

    const sid = await getSid(); // ✅ await cookies()
    if (!sid) return Response.json({ ok: false, error: "no session" }, { status: 401 });

    // open cart for this session
    const cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (!cart) return Response.json({ ok: false, error: "cart not found" }, { status: 404 });

    // verify line belongs to the cart
    const line = await db.query.cartLines.findFirst({
      where: and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)),
    });
    if (!line) return Response.json({ ok: false, error: "line not found" }, { status: 404 });

    const side = Number.isFinite(Number(body.side)) && Number(body.side) > 0 ? Number(body.side) : 1;

    // Normalize to your public R2 host (uploads.adapnow.com or r2.dev)
    const publicUrl = r2PublicUrl(body.url);

    // simple upsert: delete any existing (lineId, side), then insert the new URL
    await db
      .delete(cartArtwork)
      .where(and(eq(cartArtwork.cartLineId, lineId), eq(cartArtwork.side, side)));

    await db.insert(cartArtwork).values({ cartLineId: lineId, side, url: publicUrl });

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("[artwork:POST] failed:", err);
    return Response.json({ ok: false, error: err?.message ?? "artwork save error" }, { status: 500 });
  }
}
