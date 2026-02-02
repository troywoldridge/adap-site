/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customerAddresses } from "@/lib/db/schema/customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function s(x: unknown): string | null {
  const v = String(x ?? "").trim();
  return v.length ? v : null;
}

type Body = {
  id?: string;

  firstName?: string;
  lastName?: string;
  company?: string;

  // phone?: string; // ❌ removed — table doesn’t have this per your error
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;        // postal code
  country?: string;    // "US" | "CA" | etc.
};

function noStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;

    // Normalize inputs
    const id        = s(body.id);
    const firstName = s(body.firstName);
    const lastName  = s(body.lastName);
    const company   = s(body.company);
    // const phone     = s(body.phone); // ❌ removed
    const line1     = s(body.street1);
    const line2     = s(body.street2);
    const city      = s(body.city);
    const state     = s(body.state);
    const postal    = s(body.zip);
    const country   = (s(body.country)?.toUpperCase() ?? null) as string | null;

    // Required fields
    if (!line1 || !city || !state || !postal || !country) {
      return NextResponse.json(
        { ok: false, error: "street1, city, state, zip and country are required" },
        { status: 400 }
      );
    }

    // Use Clerk userId as the owner key; we’ll store it in customerId OR userId depending on your schema.
    const ownerId = userId;

    // Avoid mixing ?? and || without parens
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const name = (company ?? fullName) || "Address";

    // Pick the correct owner column dynamically (customerId OR userId) and keep types happy
    const ownerCol = (customerAddresses as any).customerId ?? (customerAddresses as any).userId;

    // --- UPDATE FLOW ---
    if (id) {
      // Ensure the address belongs to this owner
      const existing = await (db as any).query.customerAddresses.findFirst({
        where: and(eq(customerAddresses.id, id), eq(ownerCol as any, ownerId)),
      });

      if (!existing) {
        return NextResponse.json({ ok: false, error: "address_not_found" }, { status: 404 });
      }

      const updateValues: any = {
        name,
        line1,
        line2,
        city,
        state,
        postalCode: postal,
        country,
        updatedAt: new Date(),
      };

      await db
        .update(customerAddresses)
        .set(updateValues)
        .where(and(eq(customerAddresses.id, id), eq(ownerCol as any, ownerId)) as any);

      return noStore(NextResponse.json({ ok: true, id }));
    }

    // --- INSERT FLOW ---
    const insertValues: any = {
      name,
      line1,
      line2,
      city,
      state,
      postalCode: postal,
      country,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // attach correct owner field
    if ((customerAddresses as any).customerId) {
      insertValues.customerId = ownerId;
    } else if ((customerAddresses as any).userId) {
      insertValues.userId = ownerId;
    }

    const [row] = await db
      .insert(customerAddresses)
      .values(insertValues)
      .returning({ id: customerAddresses.id as any });

    return noStore(NextResponse.json({ ok: true, id: row.id }));
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
