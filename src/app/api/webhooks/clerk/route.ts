import "server-only";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customerAddresses } from "@/lib/db/schema/customerAddresses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreHeaders() {
  return { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };
}

export async function POST(req: Request) {
  const database = db;

  try {
    const evt = await req.json();

    if (evt?.type !== "user.created" || !evt?.data?.id) {
      return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders() });
    }

    const user = evt.data;
    const clerkUserId = user.id;
    const m = (user.public_metadata ?? {}) as Record<string, unknown>;

    const addr = {
      clerkUserId,
      label: "Default",
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      company: (m.company as string) ?? null,
      phone: user.phone_numbers?.[0]?.phone_number ?? null,
      street1: (m.street1 as string) ?? "—",
      street2: (m.street2 as string) ?? null,
      city: (m.city as string) ?? "—",
      state: (m.state as string) ?? "—",
      postalCode: (m.postalCode as string) ?? "—",
      country: ((m.country as string) ?? "US").toUpperCase(),
      isDefault: true,
    };

    await database.transaction(async (tx) => {
      await tx
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.clerkUserId, clerkUserId));

      await tx.insert(customerAddresses).values(addr);
    });

    return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders() });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 400 });
  }
}
