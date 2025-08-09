import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productReviews } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { parse as toCSV } from "json2csv"; // npm install json2csv

const ADMIN_EMAILS = ["troy.woldridge.1@gmail.com"];

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  const email = sessionClaims?.email;
  if (!userId || !email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "csv"; // csv or json

  const reviews = await db.select().from(productReviews).orderBy(productReviews.createdAt.desc());

  if (format === "json") {
    return NextResponse.json(reviews, {
      headers: {
        "Content-Disposition": `attachment; filename=reviews-export-${Date.now()}.json`,
        "Content-Type": "application/json",
      },
    });
  } else {
    const fields = [
      "id", "productId", "name", "email", "rating", "comment",
      "approved", "createdAt", "userIp", "termsAgreed", "verified"
    ];
    const csv = toCSV(reviews, { fields });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=reviews-export-${Date.now()}.csv`,
      }
    });
  }
}
