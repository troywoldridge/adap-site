import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const url = new URL(req.url);
  url.pathname = "/api/cart/current";

  const res = await fetch(url.toString(), {
    headers: { cookie, accept: "application/json" },
    cache: "no-store",
  });

  const json = await res.json();
  return Response.json(json, { status: res.status, headers: { "Cache-Control": "no-store" } });
}
