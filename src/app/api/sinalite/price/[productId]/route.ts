// src/app/api/sinalite/price/[productId]/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getConfiguredPrice } from "@/lib/sinalite.client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Safely pull a numeric total from any vendor shape */
function extractLineTotal(x: unknown): number | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const picks = [
    o.lineTotal,
    o.total,
    o.price,
    o.unitPrice, // some legacy code stored TOTAL under "unitPrice"
    // sometimes nested { price2: { price } }
    (o.price2 && typeof o.price2 === "object"
      ? (o.price2 as Record<string, unknown>).price
      : undefined),
  ].filter((v) => v !== undefined && v !== null);

  for (const v of picks) {
    const n =
      typeof v === "string"
        ? Number(v.replace(/[^\d.]/g, ""))
        : typeof v === "number"
        ? v
        : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Try to read a currency code from the vendor shape; default USD/CAD safety */
function extractCurrency(x: unknown): "USD" | "CAD" {
  if (x && typeof x === "object") {
    const cur = (x as any).currency;
    if (cur === "CAD") return "CAD";
  }
  return "USD";
}

/** Normalize option ids from various request shapes */
function normalizeOptionIds(body: unknown): number[] {
  const b = (body ?? {}) as Record<string, unknown>;
  const fromArray =
    Array.isArray(b.optionIds) ? (b.optionIds as unknown[]) :
    Array.isArray(b.productOptions) ? (b.productOptions as unknown[]) :
    null;

  if (fromArray) {
    return fromArray
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  // productOptions as object map { group: "123", ... }
  if (b.productOptions && typeof b.productOptions === "object") {
    return Object.values(b.productOptions as Record<string, unknown>)
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  return [];
}

export async function POST(
  req: NextRequest,
  ctx: { params: { productId: string } }
) {
  try {
    const { productId } = ctx.params;

    const json = await req.json().catch(() => ({} as unknown));
    const optionIds = normalizeOptionIds(json);

    if (optionIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "optionIds[] required (array) or productOptions object with numeric values" },
        { status: 400 }
      );
    }

    const pid = Number(productId);
    if (!Number.isFinite(pid) || pid <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid productId" }, { status: 400 });
    }

    const q = Number((json as any).quantity ?? 1);
    const quantity = Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;

    // Call your vendor/proxy helper (shape is not guaranteed → treat as unknown)
    const priced: unknown = await getConfiguredPrice(pid, optionIds, quantity);

    const lineTotal = extractLineTotal(priced);
    if (!lineTotal) {
      return NextResponse.json(
        { ok: false, error: "Invalid price from SinaLite/proxy" },
        { status: 502 }
      );
    }

    const currency = extractCurrency(priced);
    const unitPrice = lineTotal / Math.max(1, quantity);

    return NextResponse.json({
      ok: true,
      productId: pid,
      quantity,
      currency,
      lineTotal,
      unitPrice,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
