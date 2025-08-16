// src/app/api/cart/lines/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const SID_COOKIE = "adap_sid";
const ONE_YEAR = 60 * 60 * 24 * 365;

function readSid(req: NextRequest): string | null {
  try {
    const v = req.cookies.get(SID_COOKIE)?.value;
    if (v && v.trim()) return v.trim();
  } catch {}
  return null;
}

function makeSid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function makeLineId(sid: string, productId: number | string): string {
  return `sid:${sid}:p:${productId}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const productIdRaw = url.searchParams.get("productId");
  const qtyRaw = url.searchParams.get("qty");
  const qty = Math.max(1, Number(qtyRaw || 1));

  const productId = Number(productIdRaw);
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ ok: false, error: "productId is required (number)" }, { status: 400 });
  }

  let sid = readSid(req);
  let shouldSetCookie = false;
  if (!sid) {
    sid = makeSid();
    shouldSetCookie = true;
  }

  const lineId = makeLineId(sid, productId);

  // Build response FIRST (don’t mutate body later)
  const resp = NextResponse.json({
    ok: true,
    lines: [{ lineId, quantity: qty }],
  });

  // Then set cookie if we created a new session id
  if (shouldSetCookie) {
    resp.cookies.set(SID_COOKIE, sid, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: ONE_YEAR,
    });
  }

  return resp;
}
