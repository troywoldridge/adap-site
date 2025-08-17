import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartLines } from "@/db/schema/cart";
import { getOrCreateOpenCartBySid } from "@/lib/cart";
import { estimateShipping } from "@/lib/sinalite.client"; // <-- use the single-line helper

function getOrSetSid() {
  const jar = cookies();
  let sid = jar.get("sid")?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    jar.set("sid", sid, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  }
  return sid;
}

export async function POST(req: Request) {
  const { country, region, postal } = await req.json();

  // Normalize country to "US" | "CA" per SinaLite
  const shipCountry = String(country).toUpperCase() === "CA" ? "CA" : "US";
  const shipState = String(region || "");
  const shipZip = String(postal || "");

  const sid = getOrSetSid();
  const cart = await getOrCreateOpenCartBySid(sid);

  const lines = await db
    .select({
      productId: cartLines.productId,
      quantity: cartLines.quantity,
      optionIds: cartLines.optionIds,
    })
    .from(cartLines)
    .where(eq(cartLines.cartId, cart.id));

  // Call SinaLite per line, then merge methods by "carrier + method"
  const allQuotes = await Promise.all(
    lines.map(async (l) => {
      const opts = (l.optionIds ?? []).map(Number);
      // estimateShipping returns: { carrier, method, price, days }[]
      const methods = await estimateShipping({
        productId: Number(l.productId),
        optionIds: opts,
        shipCountry,
        shipState,
        shipZip,
      });
      // Multiply price by quantity (shipping often scales with qty/weight).
      // Adjust this if SinaLite returns price already inclusive of quantity.
      return methods.map((m) => ({
        key: `${m.carrier} :: ${m.method}`,
        name: `${m.carrier} ${m.method}`,
        amount: Number(m.price) * Number(l.quantity),
        days: Number(m.days),
      }));
    })
  );

  // Merge: sum amounts across lines for same method; avg days
  const agg = new Map<
    string,
    { name: string; amount: number; daysSum: number; count: number }
  >();

  for (const quote of allQuotes) {
    for (const m of quote) {
      const prev = agg.get(m.key);
      if (prev) {
        prev.amount += m.amount;
        prev.daysSum += m.days;
        prev.count += 1;
      } else {
        agg.set(m.key, { name: m.name, amount: m.amount, daysSum: m.days, count: 1 });
      }
    }
  }

  const currency = shipCountry === "CA" ? "CAD" : "USD";
  const methods = Array.from(agg.values()).map((x) => ({
    name: x.name,
    amount: x.amount,
    currency,
    days: Math.round(x.daysSum / Math.max(1, x.count)),
  }));

  // Sort by cheapest
  methods.sort((a, b) => a.amount - b.amount);
  const cheapest = methods[0] ?? null;

  return NextResponse.json({ methods, cheapest });
}
