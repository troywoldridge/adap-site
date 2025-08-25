import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { cartLines } from "@/db/schema/cartLines";
import { priceSinaliteProduct } from "@/lib/sinalite.pricing";
import { getOrEnsureSid } from "@/lib/getOrSetSid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}
function syncSidCookies(res: NextResponse, sid: string) {
  res.cookies.set("adap_sid", sid, COOKIE_OPTS);
  res.cookies.set("sid", sid,     COOKIE_OPTS);
}

export async function POST(req: Request) {
  // create response FIRST so Set-Cookie is preserved
  let res = NextResponse.json({ ok: true });

  try {
    const body = await req.json().catch(() => ({} as any));
    const productId = Number(body?.productId);
    const optionIds = Array.isArray(body?.optionIds)
      ? body.optionIds.map((n: any) => Number(n)).filter(Number.isFinite)
      : [];
    const quantity = Math.max(1, Number(body?.quantity) || 1);
    const store = body?.store === "CA" || body?.store === "CAD" ? "CA" : "US";
    const cloudflareImageId: string | null =
      typeof body?.cloudflareImageId === "string" ? body.cloudflareImageId : null;

    if (!productId || optionIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "productId and optionIds[] are required" },
        { status: 400 }
      );
    }

    // ensure SID & sync both cookie names
    const sid = await getOrEnsureSid({ res });
    syncSidCookies(res, sid);

    // get or create open cart
    let cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (!cart) {
      [cart] = await db.insert(carts).values({
        sid,
        status: "open",
        currency: store === "CA" ? "CAD" : "USD",
      }).returning();
    }

    // price via SinaLite (values must be ID strings; one per option group incl. Qty)
    const priced = await priceSinaliteProduct({ productId, optionIds, store });
    const unitCents = Math.round(Number(priced?.unitPrice || 0) * 100);
    const lineTotalCents = unitCents * quantity;

    // build insert object WITHOUT undefined fields
    const insertValues: typeof cartLines.$inferInsert = {
      cartId: cart.id,
      productId,
      quantity,
      optionIds,                  // jsonb
      unitPriceCents: unitCents,  // int
      lineTotalCents,             // int
      pricedOptionIds: optionIds, // jsonb
      // DO NOT set artwork unless we have a value
    };
    if (cloudflareImageId) {
      insertValues.artwork = { image: cloudflareImageId } as any;
    }

    const [line] = await db
      .insert(cartLines)
      .values(insertValues)
      .returning({ id: cartLines.id });

    res = NextResponse.json({ ok: true, lineId: line.id }, { headers: res.headers });
    return noStore(res);
  } catch (err: any) {
    // Make DB errors readable while developing
    console.error("POST /api/cart/add failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
