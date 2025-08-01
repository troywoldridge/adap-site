// src/app/api/products/[productId]/hash/route.ts
import { NextRequest, NextResponse } from "next/server";

function generateHash(optionIds: number[]) {
  if (optionIds.length !== 6) {
    throw new Error("Expected exactly 6 option IDs");
  }
  return optionIds.map((id) => String(id).padStart(2, "0")).join("");
}

export async function POST(
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

    const body = await req.json();
    const optionIds = body.optionIds;

    if (
      !Array.isArray(optionIds) ||
      optionIds.length !== 6 ||
      !optionIds.every((id) => Number.isInteger(id) && id >= 0)
    ) {
      return NextResponse.json(
        { error: "You must provide exactly 6 valid option IDs" },
        { status: 400 }
      );
    }

    const hash = generateHash(optionIds);

    return NextResponse.json({ productId, hash });
  } catch (err) {
    console.error("Error generating hash:", err);
    return NextResponse.json(
      { error: "Internal Server Error generating hash" },
      { status: 500 }
    );
  }
}

