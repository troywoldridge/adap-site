// src/app/api/price/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getConfiguredPrice } from "@/lib/sinalite.client";

/**
 * Normalized response (SinaLite-aligned):
 * {
 *   ok: true,
 *   productId: number,
 *   currency: 'USD'|'CAD',
 *   lineTotal: number,     // TOTAL for the selected combo (includes Quantity)
 *   unitPrice: number,     // lineTotal / quantity (best effort)
 *   quantity: number       // parsed from options if possible, else 1
 * }
 *
 * Accepts either:
 *  - selections: Record<string, number> (group -> optionId)
 *  - options: number[]                    (flat list of optionIds)
 *  - store: 'US' | 'CA' (optional)
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      productId?: unknown;
      selections?: Record<string, unknown>;
      options?: unknown[];
      store?: "US" | "CA";
    };

    const pid = Number(body?.productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      return NextResponse.json({ ok: false, error: "productId required" }, { status: 400 });
    }

    // Build optionIds from selections or options
    const fromSelections =
      body?.selections && typeof body.selections === "object"
        ? Object.values(body.selections as Record<string, unknown>)
        : [];
    const fromOptions = Array.isArray(body?.options) ? body?.options : [];

    const optionIds = [...fromSelections, ...fromOptions]
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (optionIds.length === 0) {
      return NextResponse.json({ ok: false, error: "optionIds[] required" }, { status: 400 });
    }

    // Your helper currently returns: { unitPrice: number; currency: 'USD'|'CAD' }
    // In your app history, "unitPrice" has actually been the TOTAL from SinaLite.
    const priced = await getConfiguredPrice(pid, optionIds);

    const currency = (priced?.currency === "CAD" ? "CAD" : "USD") as "USD" | "CAD";
    const totalFromHelper = Number((priced as any)?.unitPrice); // treat as TOTAL (per SinaLite)
    if (!Number.isFinite(totalFromHelper) || totalFromHelper <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid price from upstream" }, { status: 502 });
    }

    // Best-effort quantity from any attached meta the helper might include.
    // We don't require a specific shape to keep types happy.
    let quantity = 1;
    const og =
      ((priced as any)?.optionsByGroup as Record<string, string> | undefined) ||
      ((priced as any)?.productOptions as Record<string, string> | undefined) ||
      ((priced as any)?.pricingMeta?.productOptions as Record<string, string> | undefined) ||
      {};

    const qtyKey = Object.keys(og).find((k) => /qty|quantity/i.test(k));
    if (qtyKey) {
      const raw = String(og[qtyKey] ?? "").replace(/[^\d]/g, "");
      const q = Number.parseInt(raw, 10);
      if (Number.isFinite(q) && q > 0) quantity = q;
    }

    const unitPrice = totalFromHelper / Math.max(1, quantity);

    return NextResponse.json({
      ok: true,
      productId: pid,
      currency,
      lineTotal: totalFromHelper, // TOTAL for combo (SinaLite)
      unitPrice,
      quantity,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
