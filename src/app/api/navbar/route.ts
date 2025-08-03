// app/api/navbar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getNavbarData } from "@/lib/queries/getNavbarData";

export async function GET(req: NextRequest) {
  try {
    const navItems = await getNavbarData();
    return NextResponse.json({ navItems }, { status: 200 });
  } catch (err) {
    console.error("Failed to load navbar data:", err);
    return NextResponse.json(
      { error: "Failed to load navigation" },
      { status: 500 }
    );
  }
}
