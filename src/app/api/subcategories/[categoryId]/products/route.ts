// src/app/api/subcategories/[categoryId]/products/route.ts
import { db } from "@/lib/db";
import { products } from '@/drizzle/migrations/schema'; // assumes 'products' table with subcategory_id FK
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { categoryId: string } }) {
  const categoryId = parseInt(params.categoryId);
  const results = await db
    .select()
    .from(products)
    .where(eq(products.categoryId, categoryId));

  return NextResponse.json(results);
}
