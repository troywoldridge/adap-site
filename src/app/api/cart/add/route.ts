import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { addOrMergeLine, getOrCreateOpenCartBySid } from "@/lib/cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SID_COOKIE = "adap_sid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productId = Number(body?.productId);
    const optionIds = Array.isArray(body?.optionIds) ? body.optionIds.map((n: any) => Number(n)) : null;
    const quantity = Math.max(1, Number(body?.quantity || 1));
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
    const { line, merged } = await addOrMergeLine({ cartId: cart.id, productId, optionIds, quantity });

    return NextResponse.json({ ok: true, cartId: cart.id, lineId: line.id, merged });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to add to cart" }, { status: 500 });
  }
}
