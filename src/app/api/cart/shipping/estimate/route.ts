// src/app/api/cart/shipping/estimate/route.ts
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import {
  estimateShippingServer,
  type EstimateItem,
  type ShippingRate,
} from "@/lib/sinalite.pricing-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  country: "US" | "CA";
  state: string;
  zip: string;
  lines: { productId: number; optionIds: number[]; quantity?: number }[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const items: EstimateItem[] = (body.lines || []).map((l) => ({
      productId: Number(l.productId),
      optionIds: Array.isArray(l.optionIds)
        ? l.optionIds.map((n) => Number(n)).filter((n) => Number.isFinite(n))
        : [],
      quantity: Math.max(1, Number(l.quantity || 1)),
    }));

    if (!items.length) {
      return NextResponse.json({ ok: true, rates: [] as ShippingRate[] });
    }

    const rates = await estimateShippingServer(
      { country: body.country, state: body.state, zip: body.zip },
      items
    );

    return NextResponse.json({ ok: true, rates });
  } catch (e: any) {
    console.error("/api/cart/shipping/estimate failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
  }
}
