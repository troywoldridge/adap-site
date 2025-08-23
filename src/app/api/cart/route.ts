import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts, cartLines } from "@/db/schema";
import { getSinaliteAccessToken } from "@/lib/getSinaliteAccessToken";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

type ApiCart = {
  id: string;
  currency: "USD" | "CAD";
  subtotal: number;
  items: Array<{
    id: string;
    productId: number;
    quantity: number;
    optionIds: number[];
    unitPrice?: number;
    name?: string | null;
    image?: string | null;
  }>;
  shipping?: {
    carrier: string;
    method: string;
    cost: number;
    days: number | null;
    currency: "USD" | "CAD";
    country: "US" | "CA";
    state: string;
    zip: string;
  } | null;
};

type ApiResponse = { ok: true; cart: ApiCart } | { ok: false; error: string };

const COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}
async function getJar() {
  const maybe = cookies() as any;
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

/* ---------- Price cache (10 min TTL, tiny LRU-ish) ---------- */
const PRICE_TTL_MS = 10 * 60 * 1000;
type CacheVal = { price: number; expires: number };
const priceCache = new Map<string, CacheVal>();

function kFor(productId: number, optionIds: number[], store: "US" | "CA") {
  // sort options to normalize cache keys
  return `${store}:${productId}:${[...optionIds].sort((a, b) => a - b).join("-")}`;
}
function cacheGet(key: string): number | null {
  const v = priceCache.get(key);
  if (!v) return null;
  if (Date.now() > v.expires) {
    priceCache.delete(key);
    return null;
  }
  return v.price;
}
function cachePut(key: string, price: number) {
  if (priceCache.size > 2000) {
    const first = priceCache.keys().next().value;
    if (first) priceCache.delete(first);
  }
  priceCache.set(key, { price, expires: Date.now() + PRICE_TTL_MS });
}
const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* ---------- Sinalite helpers ---------- */
function storeCodeFor(store: "US" | "CA"): 6 | 9 {
  return store === "CA" ? 6 : 9;
}
function sinaliteBase(): string {
  return process.env.SINALITE_ENV === "sandbox"
    ? "https://api.sinaliteuppy.com"
    : process.env.SINALITE_API_BASE || "https://liveapi.sinalite.com";
}
async function priceLineFromSinalite(
  productId: number,
  optionIds: number[],
  store: "US" | "CA"
): Promise<number> {
  const key = kFor(productId, optionIds, store);
  const cached = cacheGet(key);
  if (cached != null) return cached;

  try {
    const token = await getSinaliteAccessToken();
    const url = `${sinaliteBase()}/price/${productId}/${storeCodeFor(store)}`;
    const r = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productOptions: optionIds }),
    });
    if (!r.ok) return 0;

    const j = await r.json();
    const raw = j?.price ?? 0;
    const price = round2(typeof raw === "string" ? parseFloat(raw) : Number(raw));
    cachePut(key, price);
    return price;
  } catch {
    return 0;
  }
}

/* ---------- GET /api/cart ---------- */
export async function GET() {
  let res = NextResponse.json<ApiResponse>({
    ok: true,
    cart: { id: "", currency: "USD", subtotal: 0, items: [], shipping: null } as ApiCart,
  });

  const jar = await getJar();
  const a = (jar.get?.("adap_sid")?.value ?? undefined) as string | undefined;
  const b = (jar.get?.("sid")?.value ?? undefined) as string | undefined;

  const candidates: string[] = [a, b].filter((v): v is string => !!v && v.length > 0);
  let chosen: string | undefined;
  let found: any = null;

  for (const sid of candidates) {
    const c = await db.query.carts.findFirst({
      where: and(eq(carts.sid, sid), eq(carts.status, "open")),
    });
    if (c) {
      chosen = sid;
      found = c;
      break;
    }
  }
  if (!chosen) chosen = a ?? b;
  if (chosen) {
    res.cookies.set("adap_sid", chosen, COOKIE_OPTS);
    res.cookies.set("sid", chosen, COOKIE_OPTS);
  }
  if (!found) return noStore(res);

  const lines = await db
    .select()
    .from(cartLines)
    .where(eq(cartLines.cartId, found.id))
    .orderBy(desc(cartLines.createdAt));

  const currency: "USD" | "CAD" = (found as any).currency === "CAD" ? "CAD" : "USD";
  const store: "US" | "CA" = currency === "CAD" ? "CA" : "US";

  let items = lines.map((l: any) => ({
    id: l.id,
    productId: Number(l.productId),
    quantity: Number(l.quantity ?? 1),
    optionIds: Array.isArray(l.optionIds) ? l.optionIds : [],
    name: l.name ?? null,
    image: l.cloudflareImageId ?? null,
  })) as ApiCart["items"];

  const priced = await Promise.all(
    items.map(async (it) => {
      const unitPrice = await priceLineFromSinalite(it.productId, it.optionIds, store);
      return { ...it, unitPrice: round2(unitPrice) };
    })
  );
  items = priced;

  const subtotal = round2(
    items.reduce((s, it) => s + round2(it.unitPrice ?? 0) * Number(it.quantity ?? 1), 0)
  );
  const shipping = (found as any).selectedShipping ?? null;

  res = NextResponse.json<ApiResponse>(
    { ok: true, cart: { id: found.id, currency, subtotal, items, shipping } },
    { headers: res.headers }
  );
  return noStore(res);
}

