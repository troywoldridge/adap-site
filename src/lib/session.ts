import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderSessions } from "@/lib/db/schema";

type ShippingTuple = [carrier: string, service: string, price: number, available: number];

export type ShippingInfo = {
  ShipFName: string; ShipLName: string; ShipEmail: string;
  ShipAddr: string; ShipAddr2?: string; ShipCity: string;
  ShipState: string; ShipZip: string; ShipCountry: string; ShipPhone: string;
};

export type BillingInfo = {
  BillFName: string; BillLName: string; BillEmail: string;
  BillAddr: string; BillAddr2?: string; BillCity: string;
  BillState: string; BillZip: string; BillCountry: string; BillPhone: string;
};

export interface OrderSession {
  id: string;
  userId?: string | null;

  productId: string;
  options: (number | string)[] | Record<string, any>;
  files?: { type: string; url: string }[];

  shippingInfo?: ShippingInfo | null;
  billingInfo?: BillingInfo | null;

  currency: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;

  selectedShippingRate?: ShippingTuple | null;

  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  sinaliteOrderId?: string | number | null;

  notes?: string | null;

  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

const COOKIE_KEY = "orderSessionId";

type Row = typeof orderSessions.$inferSelect;
type Insert = typeof orderSessions.$inferInsert;

/* ---------------- cookie helpers ---------------- */

type CookieJar = Awaited<ReturnType<typeof cookies>>;

async function getJar(): Promise<CookieJar> {
  const maybe = cookies() as unknown;
  if (typeof (maybe as any)?.then === "function") {
    return await (maybe as Promise<CookieJar>);
  }
  return maybe as CookieJar;
}

/* ---------------- mapping helpers ---------------- */

function toModel(row: Row): OrderSession {
  const r: any = row;
  return {
    id: r.id,
    userId: r.userId ?? null,

    productId: r.productId,
    options: r.options ?? [],
    files: r.files ?? [],

    shippingInfo: r.shippingInfo ?? null,
    billingInfo: r.billingInfo ?? null,

    currency: r.currency ?? "USD",
    subtotal: Number(r.subtotal ?? 0),
    tax: Number(r.tax ?? 0),
    discount: Number(r.discount ?? 0),
    total: Number(r.total ?? 0),

    selectedShippingRate: r.selectedShippingRate ?? null,

    stripeCheckoutSessionId: r.stripeCheckoutSessionId ?? null,
    stripePaymentIntentId: r.stripePaymentIntentId ?? null,
    sinaliteOrderId: r.sinaliteOrderId ?? null,

    notes: r.notes ?? null,
    createdAt: r.createdAt ?? null,
    updatedAt: r.updatedAt ?? null,
  };
}

function toInsert(initial: Partial<OrderSession>): Insert {
  const i = initial;
  const insert: any = {
    productId: String(i.productId ?? ""),
    options: i.options ?? [],
    files: i.files ?? [],
    shippingInfo: i.shippingInfo ?? null,
    billingInfo: i.billingInfo ?? null,
    currency: i.currency ?? "USD",
    subtotal: String(i.subtotal ?? 0),
    tax: String(i.tax ?? 0),
    discount: String(i.discount ?? 0),
    total: String(i.total ?? 0),
    selectedShippingRate: i.selectedShippingRate ?? null,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    sinaliteOrderId: null,
    notes: i.notes ?? null,
  };

  if (i.userId !== undefined) insert.userId = i.userId ?? null;
  return insert as Insert;
}

/* ---------------- public API ---------------- */

export async function getOrderSessionIdFromCookie(): Promise<string | null> {
  const jar = await getJar();
  return jar.get(COOKIE_KEY)?.value ?? null;
}

export async function setOrderSessionCookie(id: string) {
  const jar = await getJar();
  jar.set(COOKIE_KEY, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function createOrderSession(initial: Partial<OrderSession>): Promise<OrderSession> {
  const database = db;
  const [row] = await database.insert(orderSessions).values(toInsert(initial)).returning();
  await setOrderSessionCookie(row.id);
  return toModel(row);
}

export async function getOrderSession(): Promise<OrderSession | null> {
  const database = db;
  const id = await getOrderSessionIdFromCookie();
  if (!id) return null;

  const [row] = await database
    .select()
    .from(orderSessions)
    .where(eq(orderSessions.id, id))
    .limit(1);

  return row ? toModel(row) : null;
}

export async function getOrderSessionById(id: string): Promise<OrderSession | null> {
  const database = db;

  const [row] = await database
    .select()
    .from(orderSessions)
    .where(eq(orderSessions.id, id))
    .limit(1);

  return row ? toModel(row) : null;
}

export async function markOrderPaid(orderSessionId: string, stripePaymentIntentId: string) {
  const database = db;
  await database
    .update(orderSessions)
    .set({ stripePaymentIntentId })
    .where(eq(orderSessions.id, orderSessionId));
}

export async function setStripeCheckoutSessionId(orderSessionId: string, checkoutSessionId: string) {
  const database = db;
  await database
    .update(orderSessions)
    .set({ stripeCheckoutSessionId: checkoutSessionId })
    .where(eq(orderSessions.id, orderSessionId));
}

export async function saveSinaliteOrderId(orderSessionId: string, sinaliteOrderId: number) {
  const database = db;
  await database
    .update(orderSessions)
    .set({ sinaliteOrderId: String(sinaliteOrderId) })
    .where(eq(orderSessions.id, orderSessionId));
}

export async function getOrderSessionByStripeSession(
  sessionId: string,
  paymentIntentId?: string
): Promise<OrderSession | null> {
  const database = db;

  if (paymentIntentId) {
    const [a] = await database
      .select()
      .from(orderSessions)
      .where(eq(orderSessions.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    if (a) return toModel(a);
  }

  const [b] = await database
    .select()
    .from(orderSessions)
    .where(eq(orderSessions.stripeCheckoutSessionId, sessionId))
    .limit(1);

  return b ? toModel(b) : null;
}
