// src/app/api/loyalty/wallet/route.ts
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db as getDb } from "@/lib/db";
import { customers } from "@/db/schema/customer";
import { loyaltyWallets } from "@/db/schema/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanEmail(v: unknown): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (!s.includes("@") || s.startsWith("@") || s.endsWith("@")) return null;
  return s;
}

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const user = await currentUser().catch(() => null);
    const email =
      cleanEmail(user?.primaryEmailAddress?.emailAddress) ||
      cleanEmail(user?.emailAddresses?.[0]?.emailAddress) ||
      null;

    const db = getDb();
    const { select, insert, update } = db;

    // Find customer by clerk id
    let cust =
      (await select()
        .from(customers)
        .where(eq(customers.clerkUserId, userId))
        .limit(1))?.[0] ?? null;

    if (!cust) {
      if (!email) {
        return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
      }

      const inserted = await insert(customers)
        .values({ clerkUserId: userId, email })
        .returning();

      cust = inserted?.[0] ?? null;

      if (!cust) {
        return NextResponse.json({ ok: false, error: "customer_create_failed" }, { status: 500 });
      }
    } else if (!cust.email && email) {
      await update(customers).set({ email }).where(eq(customers.id, cust.id));
      cust.email = email;
    }

    // Find wallet by customerId
    let wallet =
      (await select()
        .from(loyaltyWallets)
        .where(eq(loyaltyWallets.customerId, cust.id))
        .limit(1))?.[0] ?? null;

    if (!wallet) {
      const insertedWallet = await insert(loyaltyWallets)
        .values({ customerId: cust.id, pointsBalance: 0 })
        .returning();

      wallet = insertedWallet?.[0] ?? null;

      if (!wallet) {
        return NextResponse.json({ ok: false, error: "wallet_create_failed" }, { status: 500 });
      }
    }

    const balanceRaw = (wallet as any)?.pointsBalance ?? 0;
    const balance =
      typeof balanceRaw === "number" ? balanceRaw : Number(String(balanceRaw ?? "0")) || 0;

    return NextResponse.json({ ok: true, balance });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
