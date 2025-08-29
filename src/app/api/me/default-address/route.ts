// src/app/api/my/default-address/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDefaultAddress } from "@/lib/addresses";

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const addr = await getDefaultAddress(userId);
  return NextResponse.json({ ok: true, addr });
}
