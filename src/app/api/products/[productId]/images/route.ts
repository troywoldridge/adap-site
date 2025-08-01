// src/app/api/products/[productId]/images/route.ts
import { db } from "@/lib/db";
import { images } from "@/drizzle/migrations/schema";
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
    const results = await db
      .select()
      .from(images)
      .where(eq(images.productId, productId));

    return NextResponse.json(results);
  } catch (err) {
    console.error("Error fetching images:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
