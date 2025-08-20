// src/app/api/cart/update/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";
import { eq } from "drizzle-orm";
import { priceByOptionIds, resolveStoreCode } from "@/lib/sinalite.server";

type Body = {
  lineId: string;
  productId: number;
  optionIds: (string | number)[];
  quantity?: number;
  shipCountry?: "US" | "CA";
};

function asStringArray(ids: (string | number)[]) {
  return ids.map(String);
}
function positiveInt(n: unknown): number | null {
  const x = Number(n);
  return Number.isInteger(x) && x > 0 ? x : null;
}

export async function POST(req: Request) {
  try {
    // ---------- 1) Parse & validate ----------
    let json: Body;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { lineId } = json;
    const productId = positiveInt(json.productId);
    const quantity = positiveInt(json.quantity ?? 1) ?? 1;
    const shipCountry = (json.shipCountry === "CA" ? "CA" : "US") as "US" | "CA";
    const optionIds = Array.isArray(json.optionIds) ? asStringArray(json.optionIds) : [];

    if (!lineId) {
      return NextResponse.json({ error: "lineId is required" }, { status: 400 });
    }
    if (!productId) {
      return NextResponse.json({ error: "productId must be a positive integer" }, { status: 400 });
    }
    if (optionIds.length === 0) {
      return NextResponse.json({ error: "optionIds must be a non-empty array" }, { status: 400 });
    }

    // ---------- 2) Re-price current optionIds ----------
    const storeCode = resolveStoreCode(shipCountry);
    const priced = await priceByOptionIds({
      productId,
      storeCode,
      optionIds,
    });

    const unitPriceStr = (Number(priced.price) || 0).toFixed(2); // numeric -> string
    const optionsByGroup = priced.productOptions || {};
    const sinalitePackageInfo = priced.packageInfo || {};

    // ---------- 3) Persist update ----------
    const res = await db
      .update(cartLines)
      .set({
        productId,
        optionIds,                 // jsonb string[]
        quantity,
        unitPrice: unitPriceStr,   // numeric as string
        optionsByGroup,
        sinalitePackageInfo,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cartLines.id, lineId))
      .returning({ id: cartLines.id });

    if (!res[0]) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      lineId: res[0].id,
      quantity,
      unitPrice: unitPriceStr,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Update cart failed" },
      { status: 500 }
    );
  }
}
