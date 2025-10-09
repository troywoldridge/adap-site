// src/app/api/cart/route.ts
import "server-only";
import { NextRequest } from "next/server";
import { getCurrentCart } from "@/lib/cart/getCurrentCart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest) {
  try {
    const data = await getCurrentCart();
    return Response.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "cart load failed";
    return Response.json({ ok: false, error: msg }, { status: 502 });
  }
}
