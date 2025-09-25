// src/app/api/cart/current/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

type CartRow = {
  id: string;
  sid: string;
  status: string | null;
  currency: string | null;
  selectedShipping: any | null;
  userId?: string | null;
};

async function findOpenCartBySid(sid: string): Promise<CartRow | null> {
  const [row] =
    (await db
      .select({
        id: carts.id,
        sid: carts.sid,
        status: carts.status,
        currency: carts.currency,
        selectedShipping: carts.selectedShipping,
        userId: carts.userId as any,
      })
      .from(carts)
      .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
      .limit(1)) ?? [];
  return (row as CartRow) ?? null;
}

/**
 * Create a brand-new cart with a **new SID**.
 * Retries if extremely unlucky SID collision occurs (unique sid constraint).
 */
async function createCartWithNewSid(opts: { currency?: "USD" | "CAD"; userId?: string | null }) {
  const currency = opts.currency ?? "USD";
  const userId = opts.userId ?? null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const newSid = randomUUID();
    try {
      const [inserted] = await db
        .insert(carts)
        .values({
          sid: newSid,
          status: "open" as any,
          currency,
          userId: userId as any,
        })
        .returning({
          id: carts.id,
          sid: carts.sid,
          status: carts.status,
          currency: carts.currency,
          selectedShipping: carts.selectedShipping,
          userId: carts.userId as any,
        });

      return inserted as CartRow;
    } catch (e: any) {
      // If we ever hit a sid collision (extremely rare), try again.
      if (String(e?.code) === "23505") continue;
      throw e;
    }
  }
  throw new Error("could_not_create_cart_after_retries");
}

/**
 * Ensures an **open** cart exists for the current visitor.
 * - If there’s an open cart for the current SID -> return it.
 * - If SID exists but cart is closed (or not found) -> **rotate SID**, create a new cart, set cookie.
 */
async function getOrCreateOpenCart() {
  const jar = await cookies();
  const { userId } = await auth(); // may be null for guests
  const currSid = jar.get("sid")?.value ?? jar.get("adap_sid")?.value ?? null;

  // 1) If we have a SID and an open cart, return it.
  if (currSid) {
    const open = await findOpenCartBySid(currSid);
    if (open) return { cart: open, sidChanged: false, newSid: currSid };
  }

  // 2) Otherwise create a **new** cart with a fresh SID and set cookie
  const newCart = await createCartWithNewSid({ currency: "USD", userId: userId ?? null });
  return { cart: newCart, sidChanged: true, newSid: newCart.sid };
}

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

export async function GET() {
  try {
    const { cart, sidChanged, newSid } = await getOrCreateOpenCart();

    const res = NextResponse.json({
      ok: true,
      cart: {
        id: cart.id,
        sid: cart.sid,
        status: cart.status,
        currency: cart.currency,
        selectedShipping: cart.selectedShipping,
      },
    });

    // If we created a new cart, write the **new SID** cookie
    if (sidChanged) {
      res.cookies.set("sid", newSid, COOKIE_OPTS);
      // legacy alias if you still read it anywhere:
      res.cookies.set("adap_sid", newSid, COOKIE_OPTS);
    }

    return noStore(res);
  } catch (e: any) {
    console.error("/api/cart/current GET failed:", e);
    return noStore(
      NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 }),
    );
  }
}

/** Optionally support POST doing the exact same thing as GET (idempotent) */
export const POST = GET;
