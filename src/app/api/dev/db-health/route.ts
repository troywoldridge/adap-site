// src/app/api/dev/db-health/route.ts
import "server-only";

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const pool = getPool();
    const res = await pool.query("select 1 as ok");
    const ok = Array.isArray(res?.rows) && res.rows[0]?.ok === 1;

    return NextResponse.json({
      ok,
      driver: "pg",
      now: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}
