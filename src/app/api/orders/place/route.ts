import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/lib/db";
import { carts, cartLines, cartArtwork, orders } from "@/lib/db/schema";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

/** Safe string coercion for Sinalite fields */
function toStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function groupArtByLine(
  rows: Array<{ cartLineId: string; url: string; side?: string | null }>
): Record<string, { type: string; url: string }[]> {
  const g: Record<string, { type: string; url: string }[]> = {};
  for (const a of rows) {
    if (!g[a.cartLineId]) g[a.cartLineId] = [];
    g[a.cartLineId].push({
      type: (a.side || "front") as string,
      url: a.url,
    });
  }
  return g;
}

function toSinaliteItem(
  ln: { id: string; productId: number; optionIds?: number[] | null },
  files: { type: string; url: string }[]
) {
  return {
    productId: ln.productId,
    options: Array.isArray(ln.optionIds) ? ln.optionIds : [],
    files,
    extra: ln.id,
  };
}

export async function POST(req: NextRequest) {
  try {
    const database = db;
    const body = await req.json().catch(() => ({}));

    const jar = await cookies();
    const sid =
      (body?.sid as string) ||
      jar.get("adap_sid")?.value ||
      jar.get("sid")?.value;

    if (!sid) {
      return NextResponse.json({ ok: false, error: "missing_sid" }, { status: 400 });
    }

    const [cart] = await database
      .select()
      .from(carts)
      .where(and(eq(carts.sid, sid), eq(carts.status, "open")))
      .limit(1);

    if (!cart) {
      return NextResponse.json({ ok: false, error: "cart_not_found" }, { status: 404 });
    }

    const lines = await database
      .select()
      .from(cartLines)
      .where(eq(cartLines.cartId, cart.id));

    if (!lines.length) {
      return NextResponse.json({ ok: false, error: "no_lines" }, { status: 400 });
    }

    const ship = body?.shipping ?? (cart as any)?.selectedShipping ?? null;

    const shippingInfo = {
      ShipFName: toStr((cart as any)?.shipFirstName, "Customer"),
      ShipLName: toStr((cart as any)?.shipLastName, "Name"),
      ShipEmail: toStr((cart as any)?.shipEmail, "orders@example.com"),
      ShipAddr: toStr((cart as any)?.shipAddr, "123 Address"),
      ShipAddr2: toStr((cart as any)?.shipAddr2, ""),
      ShipCity: toStr((cart as any)?.shipCity, "City"),
      ShipState: toStr(ship?.state ?? (cart as any)?.shipState, "CA"),
      ShipZip: toStr(ship?.zip ?? (cart as any)?.shipZip, "90001"),
      ShipCountry: toStr(ship?.country ?? (cart as any)?.shipCountry, "US"),
      ShipPhone: toStr((cart as any)?.shipPhone, "5555555555"),
      ShipMethod: toStr(ship?.method, "UPS Standard"),
    };

    const billingInfo = {
      BillFName: toStr((cart as any)?.billFirstName, shippingInfo.ShipFName),
      BillLName: toStr((cart as any)?.billLastName, shippingInfo.ShipLName),
      BillEmail: toStr((cart as any)?.billEmail, shippingInfo.ShipEmail),
      BillAddr: toStr((cart as any)?.billAddr, shippingInfo.ShipAddr),
      BillAddr2: toStr((cart as any)?.billAddr2, shippingInfo.ShipAddr2),
      BillCity: toStr((cart as any)?.billCity, shippingInfo.ShipCity),
      BillState: toStr((cart as any)?.billState, shippingInfo.ShipState),
      BillZip: toStr((cart as any)?.billZip, shippingInfo.ShipZip),
      BillCountry: toStr((cart as any)?.billCountry, shippingInfo.ShipCountry),
      BillPhone: toStr((cart as any)?.billPhone, shippingInfo.ShipPhone),
    };

    let artworkByLine: Record<string, { type: string; url: string }[]> = {};
    const lineIds = lines.map((l) => String(l.id));
    if (lineIds.length) {
      const artRows = await database
        .select()
        .from(cartArtwork)
        .where(inArray(cartArtwork.cartLineId, lineIds));

      artworkByLine = groupArtByLine(
        artRows.map((a: any) => ({
          cartLineId: String(a.cartLineId),
          url: String(a.url),
          side: a.side ? String(a.side) : null,
        }))
      );
    }

    const items = lines.map((ln: any) =>
      toSinaliteItem(
        {
          id: String(ln.id),
          productId: Number(ln.productId),
          optionIds: ln.optionIds,
        },
        artworkByLine[String(ln.id)] || []
      )
    );

    const rawToken = await getSinaliteAccessToken();
    const authHeader = /^Bearer\s/i.test(rawToken) ? rawToken : `Bearer ${rawToken}`;
    const apiBase = process.env.SINALITE_API_BASE || "https://api.sinaliteuppy.com";

    const placeRes = await fetch(`${apiBase}/order/new`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: authHeader },
      body: JSON.stringify({ items, shippingInfo, billingInfo }),
    });

    const reply = await placeRes.json().catch(() => null);
    if (!placeRes.ok || reply?.status === "error") {
      return NextResponse.json({ ok: false, error: "sinalite_failed", detail: reply }, { status: 502 });
    }

    const { userId } = await auth();
    await database.insert(orders as any).values({
      userId: userId ?? null,
      sid,
      cartId: String(cart.id),
      externalId: reply?.orderId?.toString?.() ?? null,
      status: "submitted",
      createdAt: new Date(),
      updatedAt: new Date(),
      itemsJson: JSON.stringify(items),
    });

    await database.update(carts).set({ status: "submitted" as any }).where(eq(carts.id, cart.id));

    return NextResponse.json({ ok: true, order: reply });
  } catch (e: any) {
    console.error("orders/place failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
