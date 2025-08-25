/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7, // 7d; tune as you like
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
type Chosen = {
  carrier: string;
  method: string;
  cost: number;
  days: number | null;
  currency: Currency;
  country?: "US" | "CA";
  state?: string;
  zip?: string;
};

export async function POST(req: NextRequest) {
  // Start response early so Set-Cookie isn’t dropped
  let res = NextResponse.json({ ok: true });

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Chosen>;
    const currency = (body.currency === "CAD" ? "CAD" : "USD") as Currency;

    if (
      !body.carrier ||
      !body.method ||
      typeof body.cost !== "number" ||
      Number.isNaN(body.cost)
    ) {
      return NextResponse.json(
        { ok: false, error: "carrier, method, and numeric cost are required" },
        { status: 400 },
      );
    }

    // unify cookie jar (Next 14/15)
    const jar = await getJar();
    const sid = (jar.get?.("adap_sid")?.value ?? jar.get?.("sid")?.value) as string | undefined;
    if (!sid) {
      return NextResponse.json({ ok: false, error: "no session" }, { status: 401 });
    }
    syncSidCookies(res, sid);

    // fetch open cart
    const cart = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (!cart) {
      return NextResponse.json({ ok: false, error: "cart not found" }, { status: 404 });
    }

    // persist exactly what the user chose (SinaLite confirms amounts later at order)
    const selectedShipping = {
      carrier: String(body.carrier),
      method: String(body.method),
      cost: Number(body.cost),
      days: typeof body.days === "number" ? body.days : null,
      currency,
      country: body.country === "CA" ? "CA" : "US",
      state: String(body.state ?? ""),
      zip: String(body.zip ?? ""),
    } as const;

    await db
      .update(carts)
      .set({ selectedShipping })
      .where(eq(carts.id, cart.id));

    res = NextResponse.json({ ok: true, selectedShipping }, { headers: res.headers });
    return noStore(res);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
