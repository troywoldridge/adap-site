/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextRequest } from "next/server";
import { getConfiguredPrice } from "@/lib/sinalite.client";

/** Force any numeric-ish value to a positive int (>=1). */
function toPositiveInt(u: unknown, fb = 1) {
  const n = Number(u as any);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fb;
}

/** Normalize unknown → number[] (allows [] for products with no options). */
function toNumberArray(u: unknown): number[] {
  if (!Array.isArray(u)) return [];
  const out: number[] = [];
  for (const v of u) {
    const n = Number(v as any);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/**
 * POST /api/sinalite/price/[productId]?store=US|CA
 * Body: { optionIds?: number[], quantity?: number }
 *
 * Notes:
 * - `optionIds` MAY be an empty array for products that don’t require options.
 * - Params must be awaited on Next 14.2+.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await ctx.params; // ✅ await params (Next 14.2+)
    const pid = Number(productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      return Response.json({ ok: false, error: "invalid productId" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      optionIds?: unknown;
      quantity?: unknown;
    };

    // ✅ allow empty array — some products have no selectable options
    const optionIds = toNumberArray(body?.optionIds);
    const quantity = toPositiveInt(body?.quantity, 1);

    // Price via your existing helper (talks to SinaLite under the hood)
    const priced = await getConfiguredPrice(pid, optionIds, quantity);

    // Soft-fail to 0 if pricing can’t be retrieved
    const unitPrice = Number(priced?.unitPrice ?? 0);
    const currency = (priced?.currency ?? "USD") as "USD" | "CAD";

    return Response.json(
      {
        ok: true,
        productId: pid,
        optionIds,
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
        currency,
        meta: priced?.meta ?? null, // keep anything extra your helper returns
      },
      { status: 200 }
    );
  } catch (err: any) {
    return Response.json(
      { ok: false, error: "pricing failed", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
