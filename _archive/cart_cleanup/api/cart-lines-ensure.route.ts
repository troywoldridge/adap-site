import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { addOrMergeLine, getOrCreateOpenCartBySid } from "@/lib/cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SID_COOKIE = "adap_sid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productId = Number(url.searchParams.get("productId"));
    const qty = Math.max(1, Number(url.searchParams.get("qty") || 1));
    if (!Number.isFinite(productId)) {
      return NextResponse.json({ ok: false, error: "productId is required (number)" }, { status: 400 });
    }

    let sid = cookies().get(SID_COOKIE)?.value;
    if (!sid) {
      sid = crypto.randomUUID();
      cookies().set(SID_COOKIE, sid, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: ONE_YEAR,
      });
    }

    const { userId } = await auth();
    const cart = await getOrCreateOpenCartBySid(sid, userId ?? null);
    const { line } = await addOrMergeLine({
      cartId: cart.id,
      productId,
      optionIds: null,
      quantity: qty,
    });

    return NextResponse.json({ ok: true, lines: [{ lineId: line.id, quantity: line.quantity }] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to ensure cart line" }, { status: 500 });
  }
}
