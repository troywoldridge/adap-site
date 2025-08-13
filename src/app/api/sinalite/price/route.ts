import { NextResponse } from "next/server";
import { getSinalitePriceRegular } from "@/lib/sinalite.client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId = body?.productId;
    const optionIds = body?.optionIds;

    if (!productId || !Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json(
        { error: true, message: "productId and optionIds[] required" },
        { status: 400 }
      );
    }

    const data = await getSinalitePriceRegular(productId, optionIds);
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err?.message ?? "Pricing failed" },
      { status: 500 }
    );
  }
}
