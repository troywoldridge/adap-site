// src/app/api/cart/add/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { carts } from "@/lib/db/schema/cart";
import { cartLines } from "@/lib/db/schema/cartLines";
import { getOrEnsureSid } from "@/lib/getOrSetSid";

// ✅ fix this path to wherever your pricing helper actually lives:
import { priceSinaliteProduct } from "@/lib/sinalite.pricing";

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
  res.cookies.set("sid", sid, COOKIE_OPTS);
}

export async function POST(req: Request) {
  // create response FIRST so Set-Cookie survives
  let res = NextResponse.json({ ok: true });

  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const productId = Number(body?.productId);
    const optionIds: number[] = Array.isArray(body?.optionIds)
      ? body.optionIds.map((n: unknown) => Number(n)).filter(Number.isFinite)
      : [];
    const quantity = Math.max(1, Number(body?.quantity) || 1);

    const storeRaw = String(body?.store ?? "US").toUpperCase();
    const store = storeRaw === "CA" || storeRaw === "CAD" ? "CA" : "US";

    const cloudflareImageId: string | null =
      typeof body?.cloudflareImageId === "string" && body.cloudflareImageId.trim()
        ? body.cloudflareImageId.trim()
        : null;

    if (!Number.isFinite(productId) || optionIds.length === 0) {
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
      [cart] = await db
        .insert(carts)
        .values({
          sid,
          status: "open",
          currency: store === "CA" ? "CAD" : "USD",
        })
        .returning();
    }

    // live price via SinaLite
    const priced = await priceSinaliteProduct({ productId, optionIds, store });
    const unitCents = Math.round(Number(priced?.unitPrice || 0) * 100);
    const lineTotalCents = unitCents * quantity;

    // build insert WITHOUT unknown columns
    const insertValues: typeof cartLines.$inferInsert = {
      cartId: cart.id,
      productId,
      optionIds,            // jsonb column in your schema
      quantity,
      unitPriceCents: unitCents,
      lineTotalCents,
      ...(cloudflareImageId ? { artwork: { image: cloudflareImageId } as any } : {}),
    };

    const [line] = await db
      .insert(cartLines)
      .values(insertValues)
      .returning({ id: cartLines.id });

    const out = NextResponse.json({ ok: true, lineId: line.id }, { headers: res.headers });
    return noStore(out);
  } catch (err: any) {
    console.error("POST /api/cart/add failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
