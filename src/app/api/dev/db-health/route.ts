import "server-only";

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const r = await pool.query<{ db: string }>("select current_database() as db");
    const dbName = r?.rows?.[0]?.db ?? null;

    return NextResponse.json({
      ok: true,
      db: dbName,
      pid: r?.rows ? (pool as any)?.options?.application_name ?? null : null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
