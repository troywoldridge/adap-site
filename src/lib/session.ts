// lib/session.ts
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orderSessions, // define this in your db schema (see below)
} from "@/db/schema";

// ------ Types you’ll store in JSON columns ------
type ShippingTuple = [carrier: string, service: string, price: number, available: number];

export interface OrderSession {
  id: string;
  userId?: string | null;

  // item
  productId: string;
  options: (number | string)[]; // for roll labels this can be an object; adjust type if needed
  files?: { type: string; url: string }[];

  // addresses
  shippingInfo: {
    ShipFName: string; ShipLName: string; ShipEmail: string;
    ShipAddr: string; ShipAddr2?: string; ShipCity: string;
    ShipState: string; ShipZip: string; ShipCountry: string; ShipPhone: string;
  };
  billingInfo: {
    BillFName: string; BillLName: string; BillEmail: string;
    BillAddr: string; BillAddr2?: string; BillCity: string;
    BillState: string; BillZip: string; BillCountry: string; BillPhone: string;
  };

  // pricing
  currency: string; // e.g. "USD"
  subtotal: number;
  tax: number;
  discount: number;
  total: number;

  selectedShippingRate?: ShippingTuple;

  // stripe + sinalite
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  sinaliteOrderId?: number | null;

  notes?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

// ------ Cookie key ------
const COOKIE_KEY = "orderSessionId";

// ------ Helpers ------
export async function getOrderSessionIdFromCookie(): Promise<string | null> {
  return cookies().get(COOKIE_KEY)?.value ?? null;
}

// Create a new order session row and set cookie (if you need to bootstrap)
export async function createOrderSession(initial: Partial<OrderSession>): Promise<OrderSession> {
  const [row] = await db.insert(orderSessions).values({
    userId: initial.userId ?? null,
    productId: String(initial.productId ?? ""),
    options: initial.options ?? [],
    files: initial.files ?? [],
    shippingInfo: initial.shippingInfo ?? null,
    billingInfo: initial.billingInfo ?? null,
    currency: initial.currency ?? "USD",
    subtotal: initial.subtotal ?? 0,
    tax: initial.tax ?? 0,
    discount: initial.discount ?? 0,
    total: initial.total ?? 0,
    selectedShippingRate: initial.selectedShippingRate ?? null,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    sinaliteOrderId: null,
    notes: initial.notes ?? null,
  }).returning();

  // set cookie
  cookies().set(COOKIE_KEY, row.id, { path: "/", httpOnly: true, sameSite: "lax" });

  return row as OrderSession;
}

// Get current order session (by cookie)
export async function getOrderSession(): Promise<OrderSession | null> {
  const id = await getOrderSessionIdFromCookie();
  if (!id) {
    return null;
  }
  const rows = await db.select().from(orderSessions).where(eq(orderSessions.id, id)).limit(1);
  return rows[0] ?? null;
}

// Get any order session by id
export async function getOrderSessionById(id: string): Promise<OrderSession | null> {
  const rows = await db.select().from(orderSessions).where(eq(orderSessions.id, id)).limit(1);
  return rows[0] ?? null;
}

// Persist Stripe IDs
export async function markOrderPaid(orderSessionId: string, stripePaymentIntentId: string) {
  await db.update(orderSessions)
    .set({ stripePaymentIntentId })
    .where(eq(orderSessions.id, orderSessionId));
}

// Save Sinalite order id after /order/new
export async function saveSinaliteOrderId(orderSessionId: string, sinaliteOrderId: number) {
  await db.update(orderSessions)
    .set({ sinaliteOrderId })
    .where(eq(orderSessions.id, orderSessionId));
}

// Lookup by Stripe session or PI (used on confirmation page)
export async function getOrderSessionByStripeSession(sessionId: string, paymentIntentId?: string): Promise<OrderSession | null> {
  const rows = await db
    .select()
    .from(orderSessions)
    .where(eq(orderSessions.stripePaymentIntentId, paymentIntentId ?? ""))
    .limit(1);

  if (rows[0]) {
    return rows[0];
  }

  const rows2 = await db
    .select()
    .from(orderSessions)
    .where(eq(orderSessions.stripeCheckoutSessionId, sessionId))
    .limit(1);

  return rows2[0] ?? null;
}

// Optional: set Stripe checkout session id at creation time
export async function setStripeCheckoutSessionId(orderSessionId: string, checkoutSessionId: string) {
  await db.update(orderSessions)
    .set({ stripeCheckoutSessionId: checkoutSessionId })
    .where(eq(orderSessions.id, orderSessionId));
}
