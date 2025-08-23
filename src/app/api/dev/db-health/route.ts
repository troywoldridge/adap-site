import { NextResponse } from "next/server";
import { db, pool } from "@/lib/db";

export async function GET() {
  // Verify Pool
  const client = await pool.connect();
  const { rows } = await client.query("select 1 as ok");
  client.release();

  // Verify Drizzle can run a raw query
  // (No schema import needed, just prove the client works)
  const result = await db.execute<any>("select current_database() as db");

  return NextResponse.json({
    ok: true,
    pg: rows[0].ok === 1,
    db: result.rows?.[0]?.db,
  });
}
