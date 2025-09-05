// src/app/api/sinalite/price/batch/route.ts
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function originFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

type BatchItem = {
  productId: number;
  optionIds: number[];
  quantity: number;
  shipCountry: "US" | "CA";
  shipState?: string;
  shipZip?: string;
  storeCode?: number; // Optional override (US=9, CA=6)
};

type BatchBody = { items: BatchItem[] };

export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const origin = originFromHeaders(h);

    const body = (await req.json().catch(() => null)) as BatchBody | null;
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const results = await Promise.all(
      body.items.map(async (it) => {
        try {
          const { productId, optionIds, quantity, shipCountry, shipState, shipZip } = it;

          const res = await fetch(`${origin}/api/sinalite/price/${productId}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              shipCountry,
              shipState: shipState ?? "",
              shipZip: shipZip ?? "",
              optionIds,
              quantity,
              storeCode: it.storeCode ?? (shipCountry === "CA" ? 6 : 9), // per Sinalite docs
            }),
          });

          if (!res.ok) {
            return {
              productId,
              ok: false as const,
              error: `http_${res.status}`,
            };
          }

          const json = await res.json().catch(() => ({} as any));
          const unit = Number(json?.unitPrice);
          const currency = json?.currency === "CAD" ? "CAD" : "USD";

          if (!Number.isFinite(unit) || unit < 0) {
            return { productId, ok: false as const, error: "invalid_price" };
          }

          return {
            productId,
            ok: true as const,
            unitPrice: unit, // dollars
            currency,
          };
        } catch (e: any) {
          return { productId: it.productId, ok: false as const, error: String(e?.message || e) };
        }
      })
    );

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    console.error("price/batch failed", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
