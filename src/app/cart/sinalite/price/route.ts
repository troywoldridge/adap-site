import { NextRequest, NextResponse } from "next/server";
import { priceSinaliteProduct } from "@/lib/sinalite.pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { productId, optionIds = [], store = "US" } = await req.json();
    const priced = await priceSinaliteProduct({ productId: Number(productId), optionIds: optionIds.map(Number), store });
    return NextResponse.json({ ok: true, unitPrice: priced.unitPrice, meta: priced.pricingMeta });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 400 });
  }
}
