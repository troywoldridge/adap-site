// src/app/api/cart/current/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";          // ✅ import from concrete files
import { cartLines } from "@/db/schema/cartLines"; // ✅ not from "./cart"
import { and, desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

// Next 14/15 compatible cookie jar getter
async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

export async function GET(_req: NextRequest) {
  try {
    // Start a response up-front so Set-Cookie survives
    let res = NextResponse.json({
      ok: true,
      items: [] as any[],
      subtotal: 0,
      currency: "USD" as "USD" | "CAD",
      selectedShipping: null as any,
    });

    const jar = await getJar();
    const cookieA = (jar.get?.("adap_sid")?.value ?? undefined) as string | undefined;
    const cookieB = (jar.get?.("sid")?.value ?? undefined) as string | undefined;

    const candidates: string[] = [cookieA, cookieB].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );

    let chosen: string | undefined;
    let foundCart: any = null;

    // Prefer the SID that actually has an OPEN cart
    for (const sid of candidates) {
      const c = await db.query.carts.findFirst({
        where: and(eq(carts.sid, sid), eq(carts.status, "open")),
      });
      if (c) {
        chosen = sid;
        foundCart = c;
        break;
      }
    }

    // Even if we didn't find an open cart, keep both cookies in sync (prefer adap_sid then sid)
    if (!chosen) chosen = cookieA ?? cookieB;
    if (chosen) {
      res.cookies.set("adap_sid", chosen, COOKIE_OPTS);
      res.cookies.set("sid", chosen, COOKIE_OPTS);
    }

    // No open cart yet → return empty payload (read endpoints shouldn't create carts)
    if (!foundCart) {
      return noStore(res);
    }

    // Load cart lines ordered newest-first
    const lines = await db
      .select()
      .from(cartLines)
      .where(eq(cartLines.cartId, foundCart.id))
      .orderBy(desc(cartLines.createdAt));

    // Normalize to the shared client shape (Cart + Review)
    const items = lines.map((l: any) => {
      const qty = Number(l.quantity ?? 1);
      const unit =
        typeof l.unitPriceCents === "number" ? l.unitPriceCents / 100 : 0;
      const lineTotal =
        typeof l.lineTotalCents === "number" ? l.lineTotalCents / 100 : unit * qty;

      return {
        id: l.id,
        productId: l.productId,
        quantity: qty,
        optionIds: Array.isArray(l.optionIds) ? l.optionIds : [],
        unitPrice: unit,
        lineTotal,
        name: null,            // hydrate later from catalog if desired
        image: null,           // Cloudflare Image ID if you store it
        optionsByGroup: {},    // hydrate if you keep a map
        attachments: [],       // hydrate from cartAttachments if needed
      };
    });

    const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.lineTotal) || 0), 0);
    const currency: "USD" | "CAD" = foundCart.currency === "CAD" ? "CAD" : "USD";
    const selectedShipping = foundCart.selectedShipping ?? null;

    res = NextResponse.json(
      { ok: true, items, subtotal, currency, selectedShipping },
      { headers: res.headers },
    );
    return noStore(res);
  } catch (e: any) {
    console.error("GET /api/cart/current failed:", e);
    return NextResponse.json(
      { ok: false, error: String(e?.message ?? e) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
