import { NextResponse } from "next/server";
import {
  getSinaliteProductMeta,
  getSinaliteProductArrays as _getArrays,
  estimateShipping,
} from "@/lib/sinalite.client";

export const dynamic = "force-dynamic";

function bad(status: number, msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.trim().toLowerCase() === "true";
  return Boolean(v);
}

/**
 * GET /api/products/:productId
 * Optional query:
 *  - storeCode?: string (defaults NEXT_PUBLIC_STORE_CODE or en_us)
 *  - withArrays?: 1|true  (include options/pricing arrays)
 *
 * Response:
 * { ok:true, productId, storeCode, meta, options?, pricing? }
 */
export async function GET(req: Request, ctx: { params: { productId: string } }) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams;

    const productIdNum = Number(ctx.params?.productId);
    if (!Number.isFinite(productIdNum)) return bad(400, "Invalid productId");

    const storeCode =
      (q.get("storeCode")?.trim() ||
        process.env.NEXT_PUBLIC_STORE_CODE ||
        "en_us").trim();

    const withArrays =
      q.get("withArrays") === "1" || q.get("withArrays") === "true";

    // Always fetch meta (per SinaLite API docs)
    let meta: unknown = null;
    try {
      meta = await getSinaliteProductMeta(productIdNum);
    } catch (e: any) {
      return bad(404, e?.message || "Product not found");
    }

    let options: any[] | undefined;
    let pricing: any[] | undefined;

    if (withArrays) {
      try {
        const { optionsArray, pricingArray, metaArray } = await _getArrays(
          productIdNum,
          storeCode
        );
        options = Array.isArray(optionsArray) ? optionsArray : [];
        pricing = Array.isArray(pricingArray) ? pricingArray : [];
        if (Array.isArray(metaArray) && metaArray.length > 0) {
          meta = metaArray[0];
        }
      } catch (e: any) {
        console.warn("[/api/products/:id] arrays fetch failed:", e?.message || e);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        productId: productIdNum,
        storeCode,
        meta,
        ...(withArrays ? { options, pricing } : {}),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/products/:id] GET error:", err?.message || err);
    return bad(500, err?.message || "Unknown error");
  }
}

/**
 * POST /api/products/:productId
 *
 * Supports shipping estimate passthrough (handy for clients scoping to one product):
 * Body:
 * {
 *   optionIds: (number|string)[],  // selected option IDs per SinaLite docs
 *   shipCountry: 'US'|'CA',
 *   shipState: string,
 *   shipZip: string,
 *   storeCode?: string
 * }
 *
 * Response:
 * { ok:true, productId, storeCode, methods:[{ carrier, service, price, available }] }
 */
export async function POST(req: Request, ctx: { params: { productId: string } }) {
  try {
    const productId = Number(ctx.params?.productId);
    if (!Number.isFinite(productId)) return bad(400, "Invalid productId");

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return bad(400, "Invalid JSON");
    }

    // 🔧 Strongly coerce unknown[] → number[] (this fixes your TS error)
    const optionIds: number[] = Array.isArray(body?.optionIds)
      ? Array.from(
          new Set(
            body.optionIds
              .map((v: unknown) => {
                const n = Number(v as any);
                return Number.isFinite(n) ? n : NaN;
              })
              .filter((n: number) => Number.isFinite(n))
          )
        )
      : [];

    if (optionIds.length === 0) return bad(400, "optionIds[] (number[]) is required");

    const shipCountryRaw = String(body?.shipCountry || "").toUpperCase();
    if (shipCountryRaw !== "US" && shipCountryRaw !== "CA") {
      return bad(400, "shipCountry must be 'US' or 'CA'");
    }
    const shipCountry = shipCountryRaw as "US" | "CA";

    const shipState = String(body?.shipState || "");
    const shipZip = String(body?.shipZip || "");
    if (!shipState || !shipZip) {
      return bad(400, "shipState and shipZip are required");
    }

    const storeCode =
      (typeof body?.storeCode === "string" && body.storeCode.trim()) ||
      process.env.NEXT_PUBLIC_STORE_CODE ||
      "en_us";

    const raw = await estimateShipping({
      productId,
      optionIds, // ✅ now strictly number[]
      shipCountry,
      shipState,
      shipZip,
      storeCode,
    });

    const methods = (raw || []).map((r: any) => ({
      carrier: String(r.carrier ?? r[0] ?? ""),
      service: String(r.method ?? r.service ?? r[1] ?? ""),
      price: Number(r.price ?? r[2] ?? 0),
      available: toBool(r.available ?? 1),
    }));

    return NextResponse.json({ ok: true, productId, storeCode, methods }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/products/:id] POST error:", err?.message || err);
    return bad(500, err?.message || "Failed to process request");
  }
}
