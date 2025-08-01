// src/app/api/products/[productId]/pricing/route.ts
import { db } from "@/lib/db";
import { pricing } from "@/drizzle/migrations/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = parseInt(params.productId);
    if (isNaN(productId) || productId <= 0) {
      return NextResponse.json(
        { error: "Invalid productId parameter" },
        { status: 400 }
      );
    }

    const hash = req.nextUrl.searchParams.get("hash");
    if (!hash || hash.length !== 12) {
      return NextResponse.json(
        { error: "Missing or invalid hash parameter" },
        { status: 400 }
      );
    }

    const [priceEntry] = await db
      .select()
      .from(pricing)
      .where(eq(pricing.productId, productId))
      .where(eq(pricing.hash, hash));

    if (!priceEntry) {
      return NextResponse.json(
        { error: "Pricing not found for given product and hash" },
        { status: 404 }
      );
    }

    return NextResponse.json(priceEntry);
  } catch (err) {
    console.error("Error fetching pricing:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
