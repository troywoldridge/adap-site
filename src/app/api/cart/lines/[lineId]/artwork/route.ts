import "server-only";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { dbClient as db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { cartArtwork } from "@/db/schema/cartArtwork";
import { r2PublicUrl } from "@/lib/r2Public";

async function getSid(): Promise<string | null> {
  const jar = await cookies();
  return jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { lineId: string } }
) {
  const database = db;
  try {
    const { lineId } = params;
    const body = await req.json();

    if (!body?.url) {
      return Response.json({ ok: false, error: "url required" }, { status: 400 });
    }

    const sid = await getSid();
    if (!sid) return Response.json({ ok: false, error: "no session" }, { status: 401 });

    const [cart] =
      (await database
        .select()
        .from(carts)
        .where(and(eq(carts.sid, sid), eq(carts.status, "open")))
        .limit(1)) ?? [];

    if (!cart) return Response.json({ ok: false, error: "cart not found" }, { status: 404 });

    const [line] =
      (await database
        .select()
        .from(cartLines)
        .where(and(eq(cartLines.id, lineId), eq(cartLines.cartId, cart.id)))
        .limit(1)) ?? [];

    if (!line) return Response.json({ ok: false, error: "line not found" }, { status: 404 });

    const side = Number(body.side) > 0 ? Number(body.side) : 1;
    const publicUrl = r2PublicUrl(body.url);

    await database
      .delete(cartArtwork)
      .where(and(eq(cartArtwork.cartLineId, lineId), eq(cartArtwork.side, side)));

    await database.insert(cartArtwork).values({ cartLineId: lineId, side, url: publicUrl });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[artwork POST]", err);
    return Response.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
