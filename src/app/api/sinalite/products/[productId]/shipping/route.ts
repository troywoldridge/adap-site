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

    const optionIdsByGroup = body?.optionIdsByGroup as Record<string, string | number> | undefined;
    const shipping = body?.shipping as { country?: "US" | "CA"; state?: string; zip?: string } | undefined;

    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }
    if (!optionIdsByGroup || !shipping?.country || !shipping?.state || !shipping?.zip) {
      return NextResponse.json(
        { error: "Missing optionIdsByGroup or shipping { country, state, zip }" },
        { status: 400 }
      );
    }

    // Per SinaLite docs: POST /order/shippingEstimate
    const rates = await estimateShipping({
      productId,
      optionIdsByGroup,
      shipCountry: shipping.country!,
      shipState: shipping.state!,
      shipZip: shipping.zip!,
    });

    return NextResponse.json({ rates }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
