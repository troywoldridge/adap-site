/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
// ⬇️ If your addresses table is exported from another file, adjust this import:
import { customerAddresses } from "@/db/schema/customer";

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

  phone?: string;      // store raw or pre-encoded; change if you encrypt elsewhere
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zip?: string;        // aka postalCode
  country?: string;    // "US", "CA", etc.

  isDefault?: boolean;
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

    // Normalize inputs as strings/booleans
    const id = s(body.id);
    const firstName = s(body.firstName);
    const lastName = s(body.lastName);
    const company = s(body.company);

    const phone = s(body.phone); // if you later add encryption, do it here

    const street1 = s(body.street1);
    const street2 = s(body.street2);
    const city = s(body.city);
    const state = s(body.state);
    const zip = s(body.zip);
    const country = (s(body.country)?.toUpperCase() ?? null) as "US" | "CA" | string | null;

    const isDefault = Boolean(body.isDefault);

    // Minimal validation (tune to your business rules)
    if (!street1 || !city || !state || !zip || !country) {
      return NextResponse.json(
        { ok: false, error: "street1, city, state, zip and country are required" },
        { status: 400 },
      );
    }

    // If isDefault=true, unset existing defaults for this user (do this before insert/update)
    if (isDefault) {
      await db
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.clerkUserId, userId));
    }

    // Update existing address (owned by this user), or insert new one
    if (id) {
      // Ensure the address belongs to the user
      const existing = await db.query.customerAddresses.findFirst({
        where: and(eq(customerAddresses.id, id), eq(customerAddresses.clerkUserId, userId)),
      });

      if (!existing) {
        return NextResponse.json(
          { ok: false, error: "address_not_found" },
          { status: 404 },
        );
      }

      await db
        .update(customerAddresses)
        .set({
          firstName,
          lastName,
          company,
          phone,
          street1,
          street2,
          city,
          state,
          postalCode: zip,   // 🔁 adjust if your column is named `zip` instead of `postalCode`
          country,
          isDefault,
          updatedAt: new Date(),
        })
        .where(eq(customerAddresses.id, id));

      return noStore(NextResponse.json({ ok: true, id }));
    } else {
      const [row] = await db
        .insert(customerAddresses)
        .values({
          clerkUserId: userId,
          firstName,
          lastName,
          company,
          phone,
          street1,
          street2,
          city,
          state,
          postalCode: zip,   // 🔁 adjust to your exact column name
          country,
          isDefault,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: customerAddresses.id });

      return noStore(NextResponse.json({ ok: true, id: row.id }));
    }
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
