// src/app/api/products/[productId]/shipping/route.ts
import { NextResponse } from "next/server";
import { estimateShipping } from "@/lib/sinalite.client";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = Number(params.productId);
    const body = await req.json().catch(() => ({}));

    const optionIds = Array.isArray(body?.optionIds) ? body.optionIds : undefined;
    const optionIdsByGroup =
      body?.optionIdsByGroup && typeof body.optionIdsByGroup === "object"
        ? (body.optionIdsByGroup as Record<string, string | number>)
        : undefined;

    const shipping = body?.shipping as { country?: "US" | "CA"; state?: string; zip?: string } | undefined;
    const customSize = typeof body?.customSize === "string" ? body.customSize : undefined;
    const storeCode = typeof body?.storeCode === "string" ? body.storeCode : undefined;

    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }
    if ((!optionIds || optionIds.length === 0) && !optionIdsByGroup) {
      return NextResponse.json(
        { error: "Provide optionIds: number[] OR optionIdsByGroup: { group: id|name }" },
        { status: 400 }
      );
    }
    if (!shipping?.country || !shipping?.state || !shipping?.zip) {
      return NextResponse.json(
        { error: "Missing shipping { country, state, zip }" },
        { status: 400 }
      );
    }

    const rates = await estimateShipping({
      productId,
      optionIds,
      optionIdsByGroup,
      shipCountry: shipping.country,
      shipState: String(shipping.state).toUpperCase().trim(),
      shipZip: String(shipping.zip).trim(),
      storeCode,
      customSize,
    });

    return NextResponse.json({ rates }, { status: 200 });
  } catch (err: any) {
    const msg = String(err?.message || "Unknown error");
    const causeStatus: number | undefined = err?.cause;
    const status =
      typeof causeStatus === "number"
        ? causeStatus
        : /Upstream\s+4\d{2}/i.test(msg)
        ? 422
        : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}
