// src/app/api/sinalite/price/[productId]/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getConfiguredPrice } from "@/lib/sinalite.client";

/**
 * Returns:
 *   { ok:true, productId, quantity, currency, lineTotal, unitPrice }
 * Where:
 *   - lineTotal = SinaLite total for the selected combo (options include Quantity)
 *   - unitPrice = lineTotal / quantity
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await ctx.params;

    const body = (await req.json().catch(() => ({}))) as {
      optionIds?: unknown;
      productOptions?: unknown;
      quantity?: unknown;
    };

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
        { status: 400 },
      );
    }

    const pid = Number(productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid productId" },
        { status: 400 },
      );
    }

    const q = Number(body.quantity ?? 1);
    const quantity = Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;

    // Your helper typically returns price for the full combo (SinaLite total).
    const priced = await getConfiguredPrice(pid, optionIds, quantity);
    const currency = (priced?.currency ?? "USD") as "USD" | "CAD";

    // Normalize legacy shapes:
    // - Some earlier code stored the SinaLite TOTAL under "unitPrice".
    // - Prefer explicit total/lineTotal if present; fallback to "unitPrice".
    const candidates = [
      priced?.lineTotal,
      priced?.total,
      priced?.price,
      priced?.unitPrice, // legacy mislabel
    ];
    let lineTotal = candidates.map(Number).find((n) => Number.isFinite(n)) ?? 0;

    if (!Number.isFinite(lineTotal) || lineTotal <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid price from SinaLite" },
        { status: 502 },
      );
    }

    const unitPrice = lineTotal / Math.max(1, quantity);

    return NextResponse.json({
      ok: true,
      productId: pid,
      quantity,
      currency,
      lineTotal,
      unitPrice,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
