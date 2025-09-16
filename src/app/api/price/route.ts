// src/app/api/price/route.ts
import "server-only";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint. Use POST /api/price/pricing with { productId, store, quantity, optionIds }.",
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Deprecated endpoint. Use POST /api/price/pricing with { productId, store, quantity, optionIds }.",
    },
    { status: 410 }
  );
}
