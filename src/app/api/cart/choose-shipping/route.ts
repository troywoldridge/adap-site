import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts } from "@/db/schema/cart";
import { and, eq, ne } from "drizzle-orm";

// Ensure Node runtime for env/cookies
export const runtime = "nodejs";

type Body = {
  carrier: string;
  method: string;
  amount: number;                  // price from the selected rate
  currency: "USD" | "CAD";
  days?: number | null;
  country: "US" | "CA";
  state: string;
  zip: string;
};

export async function POST(req: Request) {
  try {
    const p = (await req.json()) as Partial<Body>;

    // Basic validation
    const required: (keyof Body)[] = ["carrier", "method", "amount", "currency", "country", "state", "zip"];
    for (const k of required) {
      const v = p[k] as any;
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
        return NextResponse.json({ ok: false, error: `Missing ${k}.` }, { status: 400 });
      }
    }

    const sid = (await cookies()).get("sid")?.value ?? "";
    if (!sid) return NextResponse.json({ ok: false, error: "No session/cart." }, { status: 400 });

    const [cart] =
      (await db
        .select({ id: carts.id })
        .from(carts)
        .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
        .limit(1)) ?? [];
    if (!cart) return NextResponse.json({ ok: false, error: "Cart not found." }, { status: 404 });

    // Normalize to your carts.selectedShipping shape
    const selected = {
      carrier: String(p.carrier),
      method: String(p.method),
      cost: Number(p.amount),
      days: typeof p.days === "number" ? p.days : null,
      currency: p.currency === "CAD" ? "CAD" : "USD",
      country: p.country === "CA" ? "CA" : "US",
      state: String(p.state).toUpperCase(),
      zip: String(p.zip),
    } as const;

    // Persist selection; also align cart currency to the chosen rate
    await db
      .update(carts)
      .set({ selectedShipping: selected, currency: selected.currency })
      .where(eq(carts.id, cart.id));

    return NextResponse.json({ ok: true, selectedShipping: selected });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
