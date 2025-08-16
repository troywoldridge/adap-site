import { NextResponse } from "next/server";
import {
  getSinaliteProductMeta,
  // we exported fetchSinaliteProductArrays as getSinaliteProductArrays in your client
  getSinaliteProductArrays as _getArrays,
} from "@/lib/sinalite.client";

export const dynamic = "force-dynamic";

function bad(status: number, msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

/**
 * GET /api/sinalite/products/:productId
 * Query:
 *   - storeCode?: string        (defaults to NEXT_PUBLIC_STORE_CODE or "en_us")
 *   - withArrays?: "1" | "true" (include options/pricing arrays if requested)
 *
 * Response:
 * {
 *   ok: true,
 *   productId: number,
 *   storeCode: string,
 *   meta: {...},                // Sinalite product meta (per API docs)
 *   options?: any[],            // included when withArrays=1
 *   pricing?: any[]             // included when withArrays=1
 * }
 */
export async function GET(
  req: Request,
  ctx: { params: { productId: string } }
) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams;

    const productIdNum = Number(ctx.params?.productId);
    if (!productIdNum || Number.isNaN(productIdNum)) {
      return bad(400, "Invalid productId");
    }

    const storeCode =
      (q.get("storeCode")?.trim() ||
        process.env.NEXT_PUBLIC_STORE_CODE ||
        "en_us").trim();

    const withArrays =
      q.get("withArrays") === "1" || q.get("withArrays") === "true";

    // --- 1) Always fetch meta (per Sinalite docs: /product/:id)
    let meta: unknown = null;
    try {
      meta = await getSinaliteProductMeta(productIdNum);
    } catch (e: any) {
      // Upstream sometimes 404s with "Product Unavailable." — surface as 404.
      return bad(404, e?.message || "Product not found");
    }

    // --- 2) Optionally fetch arrays from /product/:id/:store (options/pricing/meta[] shapes)
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

        // If metaArray is present and first element looks richer than meta, prefer it.
        if (Array.isArray(metaArray) && metaArray.length > 0) {
          meta = metaArray[0];
        }
      } catch (e: any) {
        // Non-fatal: still respond with meta only
        console.warn(
          "[sinalite/products/:id] arrays fetch failed:",
          e?.message || e
        );
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
    console.error("[api/sinalite/products/:id] error:", err?.message || err);
    return bad(500, err?.message || "Unknown error");
  }
}

// Optional: a tiny HEAD so curl -I doesn’t 404 in dev
export async function HEAD() {
  return new NextResponse(null, { status: 204 });
}
