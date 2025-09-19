// src/app/api/me/default-address/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDefaultAddress } from "@/lib/addresses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { userId } = await auth(); // ← await is required
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const addr = await getDefaultAddress(userId);
    return NextResponse.json({ ok: true, addr });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load default address";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// Optional: guard other methods
export async function POST() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
export const PUT = POST;
export const DELETE = POST;
