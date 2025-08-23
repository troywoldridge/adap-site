import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const jar = await cookies();
  jar.set("ADAP_CART_V1", JSON.stringify({ updatedAt: Date.now(), lines: [] }), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: false,
  });
  return NextResponse.json({ ok: true });
}
