// src/app/api/sinalite/price/[productId]/route.ts
import { NextResponse } from "next/server";
import { getSinalitePriceRegular } from "@/lib/sinalite.client";

// Always hit upstream fresh (pricing is dynamic)
export const dynamic = "force-dynamic";

function bad(status: number, msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

// Small helper to normalize option IDs coming from various shapes
function normalizeOptionIds(input: unknown): number[] {
  // Accept productOptions, optionIds, or options (legacy)
  const arr =
    (Array.isArray((input as any)?.productOptions) && (input as any).productOptions) ||
    (Array.isArray((input as any)?.optionIds) && (input as any).optionIds) ||
    (Array.isArray((input as any)?.options) && (input as any).options) ||
    [];

  return Array.from(
    new Set(
      (arr as unknown[])
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n))
    )
  );
}

// Optional GET so you can curl the route and not get a 404 in dev
export async function GET() {
  return NextResponse.json({
    ok: true,
    hint:
      "POST JSON → { productOptions: number[], storeCode?: string } " +
      "to compute price via Sinalite /price/:id/:store (per Sinalite API docs).",
  });
}

export async function POST(
  req: Request,
  ctx: { params: { productId: string } }
) {
  try {
    // ---- Validate path param
    const productId = Number(ctx.params?.productId);
    if (!productId || Number.isNaN(productId)) {
      return bad(400, "Invalid productId");
    }

    // ---- Parse & validate body
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return bad(400, "Invalid JSON body");
    }

    const optionIds = normalizeOptionIds(body);
    if (optionIds.length === 0) {
      return bad(400, "Missing productOptions[] (array of numeric option IDs).");
    }

    // Store code — prefer explicit, fallback to env (per Sinalite docs)
    const storeCode =
      typeof body?.storeCode === "string" && body.storeCode.trim()
        ? body.storeCode.trim()
        : process.env.NEXT_PUBLIC_STORE_CODE || "en_us";

    // ---- Call SinaLite (per docs: POST /price/:id/:store with productOptions: number[])
    const priceResp = await getSinalitePriceRegular(productId, optionIds, storeCode);

    // Some responses nest price under different keys; we just forward upstream JSON
    // so callers can read what they need. Always JSON, never HTML.
    return NextResponse.json(
      { ok: true, productId, storeCode, optionIds, response: priceResp },
      { status: 200 }
    );
  } catch (err: any) {
    // Keep logs concise but useful
    console.error("[api/sinalite/price] error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown pricing error" },
      { status: 500 }
    );
  }
}
