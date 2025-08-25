// src/app/api/cart/shipping/choose/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts, type SelectedShipping } from "@/db/schema/cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}
async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
function syncSidCookies(res: NextResponse, sid: string) {
  res.cookies.set("adap_sid", sid, COOKIE_OPTS);
  res.cookies.set("sid", sid, COOKIE_OPTS);
}

type Currency = "USD" | "CAD";
type BodyIn = {
  carrier?: string;
  method?: string;
  cost?: number;
  days?: number | null;
  currency?: Currency;
  country?: "US" | "CA";
  state?: string;
  zip?: string;
};

export async function POST(req: NextRequest) {
  // Start response early so Set-Cookie isn’t lost
  let res = NextResponse.json({ ok: true });

  try {
    const body = (await req.json().catch(() => ({}))) as BodyIn;

    const carrier = String(body.carrier ?? "");
    const method = String(body.method ?? "");
    const cost = Number(body.cost);
    const days = typeof body.days === "number" ? body.days : null;
    const currency: Currency = body.currency === "CAD" ? "CAD" : "USD";
    const country: "US" | "CA" = body.country === "CA" ? "CA" : "US";
    const state = String(body.state ?? "");
    const zip = String(body.zip ?? "");

    if (!carrier || !method || !Number.isFinite(cost)) {
      return NextResponse.json(
        { ok: false, error: "carrier, method and numeric cost are required." },
        { status: 400 },
      );
    }

    // Read session (Next 14/15 compatible)
    const jar = await getJar();
    const sid = (jar.get?.("adap_sid")?.value ?? jar.get?.("sid")?.value) as string | undefined;
    if (!sid) {
      return NextResponse.json({ ok: false, error: "no session" }, { status: 401 });
    }
    syncSidCookies(res, sid);

    // Find open cart
    const cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (!cart) {
      return NextResponse.json({ ok: false, error: "cart not found" }, { status: 404 });
    }

    // Build EXACT SelectedShipping shape (no optionals)
    const selectedShipping: SelectedShipping = {
      carrier,
      method,
      cost,
      days,       // number | null
      currency,   // "USD" | "CAD"
      country,    // "US" | "CA"
      state,      // string (can be "")
      zip,        // string (can be "")
    };

    await db.update(carts).set({ selectedShipping }).where(eq(carts.id, cart.id));

    res = NextResponse.json({ ok: true, selectedShipping }, { headers: res.headers });
    return noStore(res);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
