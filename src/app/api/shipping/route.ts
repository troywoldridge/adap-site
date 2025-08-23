// src/app/api/shipping/estimate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

export async function POST(req: Request) {
  // Keep your current Sinalite call here. Ensure you include storeCode per Sinalite API docs.
  // const payload = await req.json();
  // const rates = await fetchSinaliteShipping(payload); // ← your existing util
  return noStore(NextResponse.json({ ok: true, rates: [] }));
}
