// src/app/api/admin/reviews/export/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
// If your export lives elsewhere, adjust this import path:
import { productReviews } from "@/lib/db/schema/productReviews";
import { desc } from "drizzle-orm";
import { parse as toCSV } from "json2csv"; // we'll add a .d.ts so TS is happy

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ["troy.woldridge.1@gmail.com"];

export async function GET(req: NextRequest) {
  // ✅ await auth() (fixes: “Property 'userId' does not exist on type 'Promise<…>'”)
  const { userId } = await auth();

  // ✅ get email from Clerk (sessionClaims isn’t guaranteed to include email)
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  if (!userId || !email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();

  // ✅ use drizzle's desc() helper (fixes: “Property 'desc' does not exist …”)
  const reviews = await db
    .select()
    .from(productReviews)
    .orderBy(desc(productReviews.createdAt));

  if (format === "json") {
    return new NextResponse(JSON.stringify(reviews), {
      headers: {
        "Content-Disposition": `attachment; filename=reviews-export-${Date.now()}.json`,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  // Adjust field names to match your actual columns
  const fields = [
    "id",
    "productId",
    "name",
    "email",
    "rating",
    "comment",
    "approved",
    "createdAt",
    "userIp",
    "termsAgreed",
    "verified",
  ];

  // ✅ TS-safe parse (we add a simple module declaration below)
  const csv = toCSV(reviews as any, { fields });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=reviews-export-${Date.now()}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
