import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listAddresses, createAddress } from "@/lib/addresses";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const rows = await listAddresses(userId);
  return NextResponse.json({ ok: true, addresses: rows });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const row = await createAddress(userId, {
    name: body.name,
    line1: body.line1,
    line2: body.line2 ?? null,
    city: body.city,
    state: body.state,
    postalCode: body.postalCode,
    country: body.country ?? "US",
    phone: body.phone ?? null,
    isDefault: !!body.isDefault,
  });
  const rows = await listAddresses(userId);
  return NextResponse.json({ ok: true, address: row, addresses: rows });
}
