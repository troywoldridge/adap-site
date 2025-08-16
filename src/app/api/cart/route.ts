import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateOpenCart, getCurrentCartFull } from "@/lib/cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const { userId } = auth();
    const cart = await getOrCreateOpenCart(userId ?? null);
    const full = await getCurrentCartFull(cart.id);
    return NextResponse.json({ ok: true, cartId: cart.id, ...full });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to fetch cart" }, { status: 500 });
  }
}
