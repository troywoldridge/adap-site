// src/app/api/products/[productId]/options/route.ts
import { db } from "@/lib/db";
import { options } from "@/drizzle/migrations/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const productId = parseInt(params.productId);

  if (isNaN(productId) || productId <= 0) {
    return NextResponse.json({ error: "Invalid productId parameter" }, { status: 400 });
  }

  try {
    const productOptions = await db
      .select()
      .from(options)
      .where(eq(options.productId, productId));

    return NextResponse.json(productOptions);
  } catch (err) {
    console.error("Error fetching product options:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
