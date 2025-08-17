// src/app/api/cart/update/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";
import { eq } from "drizzle-orm";
import { priceByOptionIds, resolveStoreCode } from "@/lib/sinalite.server";

type Body = {
  lineId: string; // the cartLines.id (uuid)
  productId: number;
  optionIds: (string | number)[];
  quantity?: number;
  shipCountry?: "US" | "CA";
};

export async function POST(req: Request) {
  try {
    const { lineId, productId, optionIds, quantity = 1, shipCountry = "US" } = (await req.json()) as Body;

    if (!lineId || !productId || !Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json({ error: "Missing lineId, productId, or optionIds" }, { status: 400 });
    }

    const storeCode = resolveStoreCode(shipCountry);

    // 1) Re-price current optionIds
    const priced = await priceByOptionIds({
      productId,
      storeCode,
      optionIds,
    });

    const unitPrice = Number(priced.price) || 0;
    const optionsByGroup = priced.productOptions || {};
    const sinalitePackageInfo = priced.packageInfo || {};

    // 2) Persist the recalculated values
// src/app/api/cart/update/route.ts
// ...
// BEFORE .set({ ... }) compute unitPrice string:
const unitPriceStr = (Number(priced.price) || 0).toFixed(2);

await db
  .update(cartLines)
  .set({
    optionIds: optionIds.map(String),
    quantity,
    unitPrice: unitPriceStr,          // <-- string, not number ✅
    optionsByGroup,
    sinalitePackageInfo,
    updatedAt: new Date().toISOString(),
  })
  .where(eq(cartLines.id, lineId));


    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Update cart failed" },
      { status: 500 }
    );
  }
}
