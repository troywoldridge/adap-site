import { NextResponse } from "next/server";
import { estimateShipping } from "@/lib/sinalite.client";  // per SinaLite docs
import { resolveStoreCode } from "@/lib/sinalite.server";  // MUST return a string store code like "en_us"

type Line = { productId: number; optionIds: (number | string)[] };
type Body = {
  shipCountry: "US" | "CA";
  shipState: string;
  shipZip: string;
  lines: Line[];
  storeCode?: string;
};

function toNumArray(u: unknown): number[] {
  if (!Array.isArray(u)) {
    return [];
  }
  return u.map((v) => Number(v)).filter(Number.isFinite) as number[];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const shipCountry: "US" | "CA" = body?.shipCountry === "CA" ? "CA" : "US";
    const shipState = String(body?.shipState || "").trim();
    const shipZip = String(body?.shipZip || "").trim();
    const lines = Array.isArray(body?.lines) ? body.lines : [];

    if (!shipState || !shipZip) {
      return NextResponse.json({ ok: false, error: "shipState and shipZip are required" }, { status: 400 });
    }
    if (!lines.length) {
      return NextResponse.json({ ok: false, error: "lines[] required" }, { status: 400 });
    }

    // 🔑 Ensure string storeCode (SinaLite docs expect the store code string)
    const storeCode: string =
      (typeof body?.storeCode === "string" && body.storeCode.trim()) ||
      String(resolveStoreCode(shipCountry)); // force to string if your helper returns numbers

    // Call per-line and flatten (SinaLite endpoint expects { productId, optionIds, destination... })
    const results = await Promise.all(
      lines.map((l) =>
        estimateShipping({
          productId: Number(l.productId),
          optionIds: toNumArray(l.optionIds),
          shipCountry,
          shipState,
          shipZip,
          storeCode,
        })
      )
    );

    const rates = results
      .flat()
      .filter(Boolean)
      .map((r: any) => ({
        carrier: String(r.carrier ?? r[0] ?? ""),
        method: String(r.method ?? r.service ?? r[1] ?? ""),
        price: Number(r.price ?? r[2] ?? 0),
        days: r.days ?? r.eta ?? null,
      }));

    return NextResponse.json({ ok: true, rates }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Estimate failed" }, { status: 500 });
  }
}
