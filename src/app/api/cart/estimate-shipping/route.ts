// src/app/api/cart/estimate-shipping/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextRequest } from "next/server";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";
import { getSinaliteProductArrays, normalizeOptionGroups } from "@/lib/sinalite.client";

type LineIn = { productId: number; optionIds: number[]; quantity?: number };
type BodyIn = {
  shipCountry?: string;
  shipState?: string;
  shipZip?: string | number;
  items?: LineIn[];
  store?: "US" | "CA" | "USD" | "CAD";
};

const upper = (s: unknown) => String(s ?? "").trim().toUpperCase();
const asZip = (u: unknown) => String(u ?? "").trim();
const toNum = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
};
const normStore = (s: unknown): "US" | "CA" => {
  const v = String(s || "US").toUpperCase();
  return v === "CA" || v === "CAD" ? "CA" : "US";
};

/**
 * Build a map from option value id -> option-group key (string the API expects)
 * Example:  { 30: "Stock", 4: "size", 105: "qty", 93: "Coating", 540: "Round Corners", 140: "Turnaround" }
 */
async function buildValueIdToGroupKey(productId: number): Promise<Record<number, string>> {
  try {
    const { optionsArray } = await getSinaliteProductArrays(String(productId));
    const groups = normalizeOptionGroups(optionsArray || []);
    const map: Record<number, string> = {};

    for (const g of groups as any[]) {
      // Try best-effort to match Sinalite’s examples for keys: prefer provided label/name
      const rawKey =
        (g?.name ?? g?.groupName ?? g?.label ?? g?.title ?? "").toString().trim();

      if (!rawKey) continue;

      const key = rawKey; // keep original case (examples show both camel and lowercase)
      const opts: any[] =
        Array.isArray(g?.options) ? g.options :
        Array.isArray(g?.values) ? g.values :
        Array.isArray(g?.items) ? g.items :
        Array.isArray(g?.choices) ? g.choices : [];

      for (const o of opts) {
        const idRaw = (o?.id ?? o?.valueId ?? o?.optionId ?? o?.value ?? o?.code);
        const id = Number(idRaw);
        if (Number.isFinite(id) && id > 0) {
          map[id] = key;
        }
      }
    }
    return map;
  } catch {
    return {};
  }
}

/** Convert a cart line’s optionIds[] to the { options: { [group]: "valueId" } } shape */
async function lineToSinaOptions(line: LineIn): Promise<{ options: Record<string, string> } | null> {
  const pid = toNum(line?.productId);
  if (pid == null) return null;

  const ids = Array.isArray(line?.optionIds)
    ? line.optionIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : [];

  if (ids.length === 0) return null;

  const v2g = await buildValueIdToGroupKey(pid);
  const options: Record<string, string> = {};

  for (const id of ids) {
    const key = v2g[id];
    if (!key) continue;                // skip unknowns
    options[key] = String(id);         // value must be the ID as a string (per docs)
  }

  if (Object.keys(options).length === 0) return null;
  return { options };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as BodyIn;

    const store = normStore(body.store);
    const ShipCountry = upper(body.shipCountry);
    const ShipState = upper(body.shipState);
    const ShipZip = asZip(body.shipZip);

    if (!ShipCountry || !ShipState || !ShipZip) {
      return Response.json(
        { ok: false, error: "country, state/province and postal/zip are required" },
        { status: 400 }
      );
    }

    const lines = Array.isArray(body.items) ? body.items : [];
    const normalized = lines
      .map((l) => ({ productId: toNum(l?.productId), optionIds: l?.optionIds || [] }))
      .filter((l) => l.productId !== null) as { productId: number; optionIds: number[] }[];

    if (!normalized.length) {
      return Response.json(
        { ok: false, error: "No shippable items (missing productId/optionIds[])." },
        { status: 400 }
      );
    }

    // Convert each line to { productId, options: { ... } } and merge by productId
    // (SinaLite’s example shows items array with productId + options object)
    const byPid: Record<number, Record<string, string>> = {};

    for (const l of normalized) {
      const converted = await lineToSinaOptions(l);
      if (!converted) continue;
      const current = (byPid[l.productId] ||= {});
      // merge (if multiple selections for same group, last one wins)
      for (const [k, v] of Object.entries(converted.options)) current[k] = v;
    }

    const items = Object.entries(byPid).map(([pid, options]) => ({
      productId: Number(pid),
      options,
    }));

    if (!items.length) {
      return Response.json(
        {
          ok: false,
          error:
            "Could not map optionIds to Sinalite option groups. Ensure each line has valid optionIds including a quantity selection.",
        },
        { status: 400 }
      );
    }

    const bearer = await getSinaliteAccessToken();
    const base =
      process.env.SINALITE_BASE_URL ||
      // default to LIVE; set SINALITE_BASE_URL=https://api.sinaliteuppy.com for sandbox
      "https://liveapi.sinalite.com";

    const url = `${base}/order/shippingEstimate`;

    const payload = {
      items,
      shippingInfo: {
        ShipState,
        ShipZip,
        ShipCountry,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: bearer, // "Bearer <token>"
        "content-type": "application/json",
        "x-sinalite-store": store, // harmless if not used
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not JSON => treat as error surface */
    }

    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          error: `SinaLite estimate failed (${res.status})`,
          detail: json ?? text?.slice(0, 4000) ?? null,
        },
        { status: res.status }
      );
    }

    // Docs show: { statusCode: 200, body: [ ["UPS","UPS Standard", 9.1, 1], ... ] }
    const arr: any[] = Array.isArray(json?.body) ? json.body : Array.isArray(json) ? json : [];
    const currency = store === "CA" ? "CAD" : "USD";

    const rates =
      arr
        .map((r) => {
          if (!Array.isArray(r) || r.length < 4) return null;
          const [carrier, method, price, days] = r;
          const cost = Number(price);
          const etaDays = Number(days);
          if (!Number.isFinite(cost)) return null;
          return {
            carrier: String(carrier ?? ""),
            method: String(method ?? ""),
            cost,
            days: Number.isFinite(etaDays) ? etaDays : null,
            currency,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a!.cost - b!.cost) as Array<{
        carrier: string;
        method: string;
        cost: number;
        days: number | null;
        currency: string;
      }>;

    return Response.json({ ok: true, rates }, { status: 200 });
  } catch (err: any) {
    return Response.json(
      { ok: false, error: "Shipping estimate route crashed", detail: String(err?.message || err) },
      { status: 502 }
    );
  }
}
