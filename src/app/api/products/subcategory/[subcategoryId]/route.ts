// src/app/api/products/subcategory/[subcategoryId]/route.ts
import { NextResponse } from "next/server";
import { getProductsBySubcategory } from "@/lib/queries/products";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: { subcategoryId?: string } }
) {
  const rawId = params.subcategoryId;

  if (!rawId) {
    return errorResponse("Missing subcategoryId parameter", 400);
  }

  const subcategoryId = Number(rawId);
  if (isNaN(subcategoryId) || subcategoryId <= 0) {
    return errorResponse("Invalid subcategoryId parameter", 400);
  }

  try {
    const products = await getProductsBySubcategory(subcategoryId);

    if (!products || products.length === 0) {
      return errorResponse("No products found for this subcategory", 404);
    }

    return NextResponse.json(products);
  } catch (err) {
    console.error("Error fetching products by subcategory:", err);
    return errorResponse("Internal Server Error", 500);
  }
}
