import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts } from "@/lib/db/schema/cart";
import { cartLines } from "@/lib/db/schema/cartLines";
import { and, eq, ne } from "drizzle-orm";
import { getSinaliteBearer, API_BASE } from "@/lib/sinalite.server";

export const runtime = "nodejs";

type ReqBody = {
  shipCountry: "US" | "CA";
  shipState: string;
  shipZip: string;
  items?: { productId: number; optionIds: number[] }[];
};

function toNumArray(u: unknown): number[] {
  if (Array.isArray(u)) return u.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  return [];
}
function parseChain(chain?: string | null): number[] {
  if (!chain) return [];
  return chain
    .split(/[^0-9]+/g)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

export async function POST(req: Request) {
  try {
    const body: ReqBody = await req.json();
    if (!body?.shipCountry || !body?.shipState || !body?.shipZip) {
      return NextResponse.json(
        { ok: false, error: "Missing destination fields (country/state/zip)." },
        { status: 400 }
      );
    }

    // 1) Build items
    let items: { productId: number; optionIds: number[] }[] = [];

    if (Array.isArray(body.items) && body.items.length) {
      items = body.items
        .map((i) => ({ productId: Number(i.productId), optionIds: toNumArray(i.optionIds) }))
        .filter((i) => Number.isFinite(i.productId) && i.optionIds.length > 0);
    } else {
      const sid = (await cookies()).get("sid")?.value ?? "";
      if (!sid) return NextResponse.json({ ok: false, error: "No session/cart." }, { status: 400 });

      const [cart] =
        (await db
          .select({ id: carts.id })
          .from(carts)
          .where(and(eq(carts.sid, sid), ne(carts.status, "closed")))
          .limit(1)) ?? [];
      if (!cart) return NextResponse.json({ ok: false, error: "Cart not found." }, { status: 404 });

      const rows = await db
        .select({
          productId: cartLines.productId,
          optionIds: cartLines.optionIds,
          pricedOptionIds: cartLines.pricedOptionIds,
          optionChain: cartLines.optionChain,
        })
        .from(cartLines)
        .where(eq(cartLines.cartId, cart.id));

      items = rows
        .map((r) => {
          const pid = Number(r.productId);
          const opts =
            toNumArray(r.pricedOptionIds) ||
            toNumArray(r.optionIds) ||
            parseChain(r.optionChain);
          return { productId: pid, optionIds: opts };
        })
        .filter((i) => Number.isFinite(i.productId) && i.optionIds.length > 0);
    }

    if (!items.length) {
      return NextResponse.json(
        { ok: false, error: "No shippable items (missing productId/optionIds[])." },
        { status: 400 }
      );
    }

    // 2) Call Sinalite
    const token = await getSinaliteBearer();
    const payload = {
      items: items.map((it) => ({ productId: it.productId, options: it.optionIds.map(String) })),
      shippingInfo: {
        ShipCountry: body.shipCountry,
        ShipState: body.shipState,
        ShipZip: body.shipZip,
      },
    };

    const res = await fetch(`${API_BASE}/order/shippingEstimate`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: token },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Sinalite error ${res.status}: ${raw.slice(0, 200)}` },
        { status: 502 }
      );
    }

    // Some environments send HTML error pages — guard JSON parsing
    let data: { statusCode: number; body: [string, string, number | string, number | string][] };
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { ok: false, error: `Sinalite returned non-JSON (${res.status}). ${raw.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const currency: "USD" | "CAD" = body.shipCountry === "US" ? "USD" : "CAD";
    const rates = (data.body ?? []).map(([carrier, method, price, days]) => {
      const amt = Number(price);
      const d = Number(days);
      return {
        carrier,
        serviceCode: String(method),
        serviceName: String(method),
        amount: Number.isFinite(amt) ? amt : 0,
        currency,
        eta: Number.isFinite(d) ? `${d} business day${d === 1 ? "" : "s"}` : null,
        days: Number.isFinite(d) ? d : null,
      };
    });

    return NextResponse.json({ ok: true, rates });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
