// src/app/api/price/pricing/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { computePrice } from "@/lib/price/compute";
import type { Store } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      productId?: number | string;
      store?: Store;              // "US" | "CA"
      quantity?: number;
      optionIds?: number[];
      categoryId?: number | null;
      subcategoryId?: number | null;
    };

    const productId = Number(body?.productId);
    const store: Store = body?.store === "CA" ? "CA" : "US";
    const quantity = Math.max(1, Math.floor(Number(body?.quantity ?? 1)));
    const optionIds = Array.isArray(body?.optionIds)
      ? body!.optionIds!.map((n) => Number(n)).filter(Number.isFinite)
      : [];

    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json({ ok: false, error: "invalid_productId" }, { status: 400 });
    }
    if (optionIds.length === 0) {
      return NextResponse.json({ ok: false, error: "missing_optionIds" }, { status: 400 });
    }

    const result = await computePrice({
      productId,
      store,
      quantity,
      optionIds,
      categoryId: body?.categoryId ?? null,
      subcategoryId: body?.subcategoryId ?? null,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("POST /api/price/pricing error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "pricing_failed" },
      { status: 500 },
    );
  }
}
