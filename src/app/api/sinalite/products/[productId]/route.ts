// src/app/api/sinalite/price/[productId]/route.ts
import { NextResponse } from "next/server";
import { getSinalitePriceRegular } from "@/lib/sinalite.client";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = Number(params.productId);
    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }

    const body = await req.json();
    // Expected: { productOptions: number[], qty?: number, storeCode?: string }
    const productOptions = Array.isArray(body?.productOptions) ? body.productOptions : null;
    const storeCode = typeof body?.storeCode === "string" ? body.storeCode : (process.env.NEXT_PUBLIC_STORE_CODE || "en_us");

    if (!productOptions || productOptions.length === 0) {
      return NextResponse.json({ error: "Missing productOptions[]" }, { status: 400 });
    }

    // NOTE: SinaLite’s /price/:id/:store expects productOptions (selected option IDs).
    // Some products (labels, etc.) may not have a Qty group; their docs sometimes allow a manual qty channel,
    // but the canonical /price call still keys from option IDs. We simply pass productOptions through.
    // If you later want to support a "manual qty" → optionId translator, I can wire a product‑specific map here.
    const priceResp = await getSinalitePriceRegular(productId, productOptions, storeCode);

    // Return clean JSON (never HTML)
    return NextResponse.json(priceResp, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown pricing error" },
      { status: 500 }
    );
  }
}

