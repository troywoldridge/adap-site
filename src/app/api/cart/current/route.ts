import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { getOrCreateOpenCartBySid, getCurrentCartFull } from "@/lib/cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SID_COOKIE = "adap_sid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function GET(_req: NextRequest) {
  try {
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
    const full = await getCurrentCartFull(cart.id);
    return NextResponse.json({ ok: true, cartId: cart.id, ...full });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to fetch cart" }, { status: 500 });
  }
}
