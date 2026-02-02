import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { dbClient as db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const database = db;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // TODO: replace with real logic
  // await database.update(...)

  return NextResponse.json({ ok: true });
}
