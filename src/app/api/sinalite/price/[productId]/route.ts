// src/app/api/sinalite/price/[productId]/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getConfiguredPrice } from "@/lib/sinalite.client";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as {
      optionIds?: unknown;
      productOptions?: unknown;
      quantity?: unknown;
    };

    // accept optionIds OR productOptions (both arrays of ids)
    const rawIds =
      (Array.isArray(body.optionIds) && body.optionIds) ||
      (Array.isArray(body.productOptions) && body.productOptions) ||
      [];

    const optionIds = (rawIds as unknown[])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (optionIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "optionIds[] required" },
        { status: 400 }
      );
    }

    const pid = Number(productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid productId" },
        { status: 400 }
      );
    }

    const q = Number(body.quantity ?? 1);
    const quantity = Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;

    const priced = await getConfiguredPrice(pid, optionIds, quantity);
    const unitPrice = Number(priced?.unitPrice ?? 0);
    const currency = (priced?.currency ?? "USD") as "USD" | "CAD";

    return NextResponse.json({
      ok: true,
      productId: pid,
      quantity,
      unitPrice,
      currency,
      lineTotal: unitPrice * quantity,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
