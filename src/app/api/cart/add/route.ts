// src/app/api/cart/add/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";
import { priceByOptionIds, resolveStoreCode } from "@/lib/sinalite.server";
import { getOrCreateCartForSession } from "@/lib/cart";

type Body = {
  productId: number;
  optionIds: (string | number)[];
  quantity?: number;
  shipCountry?: "US" | "CA";
};

export async function POST(req: Request) {
  try {
    const { productId, optionIds, quantity = 1, shipCountry = "US" } = (await req.json()) as Body;

    if (!productId || !Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json({ error: "Missing productId or optionIds" }, { status: 400 });
    }

    const storeCode = resolveStoreCode(shipCountry);
    const priced = await priceByOptionIds({
      productId,
      storeCode,
      optionIds,
    });

    // IMPORTANT: numeric columns in Drizzle expect string values
    const unitPriceNumber = Number(priced.price) || 0;
    const unitPrice = unitPriceNumber.toFixed(2); // <- string

    const optionsByGroup = priced.productOptions || {};
    const sinalitePackageInfo = priced.packageInfo || {};

    const cart = await getOrCreateCartForSession();

    await db.insert(cartLines).values({
      cartId: cart.id,                       // uuid string
      productId,                             // integer
      optionIds: optionIds.map(String),      // jsonb string[]
      quantity,                              // integer
      unitPrice,                             // <-- string for numeric column
      optionsByGroup,                        // jsonb
      sinalitePackageInfo,                   // jsonb
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Add to cart failed" },
      { status: 500 }
    );
  }
}
