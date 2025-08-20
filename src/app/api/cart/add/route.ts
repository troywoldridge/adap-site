// src/app/api/cart/add/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";
import { and, eq } from "drizzle-orm";
import { priceByOptionIds, resolveStoreCode } from "@/lib/sinalite.server";
import { getOrCreateCartForSession } from "@/lib/cart";
import { rateLimit } from "@/lib/rateLimit";

type Body = {
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

    const productId = positiveInt(json.productId);
    const quantity = positiveInt(json.quantity ?? 1) ?? 1;
    const shipCountry = (json.shipCountry === "CA" ? "CA" : "US") as "US" | "CA";
    const optionIds = Array.isArray(json.optionIds) ? asStringArray(json.optionIds) : [];

    if (!productId) {
      return NextResponse.json({ error: "productId must be a positive integer" }, { status: 400 });
    }
    if (optionIds.length === 0) {
      return NextResponse.json({ error: "optionIds must be a non-empty array" }, { status: 400 });
    }

    // ---------- 2) Price via Sinalite (canonical) ----------
    const storeCode = resolveStoreCode(shipCountry); // US=9, CA=6 per docs
    const priced = await priceByOptionIds({
      productId,
      storeCode,
      optionIds,
    });

    // Drizzle numeric => string
    const unitPrice = (Number(priced.price) || 0).toFixed(2);
    const optionsByGroup = priced.productOptions || {};     // { qty:"...", size:"...", ... }
    const sinalitePackageInfo = priced.packageInfo || {};   // weight/box size, etc.

    // ---------- 3) Ensure cart ----------
    const cart = await getOrCreateCartForSession();

    // ---------- 4) Idempotent merge: if same product + exact same optionIds, bump quantity ----------
    // NOTE: comparing JSON arrays: we store optionIds as string[] jsonb; equality check done app-side
    const existingLines = await db
      .select()
      .from(cartLines)
      .where(and(eq(cartLines.cartId, cart.id), eq(cartLines.productId, productId)));

    // Find a line whose optionIds match exactly (order-sensitive). If your data may vary in order,
    // sort both arrays before comparing.
    const match = existingLines.find((l) => {
      const a = Array.isArray(l.optionIds) ? l.optionIds : [];
      if (a.length !== optionIds.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (String(a[i]) !== optionIds[i]) {
          return false;
        }
      }
      return true;
    });

    if (match) {
      const newQty = (Number(match.quantity) || 1) + quantity;
      await db
        .update(cartLines)
        .set({
          quantity: newQty,
          unitPrice,                 // re-sync price in case catalog changed
          optionsByGroup,
          sinalitePackageInfo,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(cartLines.id, match.id));

      return NextResponse.json({
        ok: true,
        merged: true,
        lineId: match.id,
        quantity: newQty,
        unitPrice,
      });
    }

    // ---------- 5) Insert new line ----------
    const inserted = await db
      .insert(cartLines)
      .values({
        cartId: cart.id,
        productId,
        optionIds,                 // jsonb string[]
        quantity,
        unitPrice,                 // numeric as string
        optionsByGroup,            // jsonb
        sinalitePackageInfo,       // jsonb
      })
      .returning({ id: cartLines.id });

    return NextResponse.json({
      ok: true,
      merged: false,
      lineId: inserted[0]?.id,
      quantity,
      unitPrice,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Add to cart failed" },
      { status: 500 }
    );
  }
}
