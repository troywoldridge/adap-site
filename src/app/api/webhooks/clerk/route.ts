// app/api/webhooks/clerk/route.ts (or your current file path)
import "server-only";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customerAddresses } from "@/db/schema/customerAddresses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreHeaders() {
  return { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };
}

type ClerkUserCreated = {
  type: "user.created";
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    phone_numbers?: Array<{ phone_number?: string | null }>;
    public_metadata?: Record<string, unknown>;
  };
};

/**
 * NOTE: In production, VERIFY the Clerk webhook signature:
 * https://clerk.com/docs/webhooks/svix
 * This sample assumes you've already verified the request.
 */
export async function POST(req: Request) {
  try {
    const evt = (await req.json()) as Partial<ClerkUserCreated>;
    if (evt?.type !== "user.created" || !evt.data?.id) {
      return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders() });
    }

    const user = evt.data;
    const clerkUserId = user.id;

    // Pull optional fields from Clerk data / public_metadata
    const m = (user.public_metadata ?? {}) as Record<string, unknown>;

    const addr = {
      clerkUserId,
      // customerId: ... // if you also upsert a customer, set it here
      label: "Default",
      firstName: (user.first_name ?? null) as string | null,
      lastName: (user.last_name ?? null) as string | null,
      company: (m.company as string) ?? null,
      phone: (user.phone_numbers?.[0]?.phone_number ?? null) as string | null,
      street1: (m.street1 as string) ?? "—",
      street2: (m.street2 as string) ?? null,
      city: (m.city as string) ?? "—",
      state: (m.state as string) ?? "—",
      postalCode: (m.postalCode as string) ?? "—",
      country: ((m.country as string) ?? "US").toUpperCase(),
      isDefault: true,
    };

    await db.transaction(async (tx) => {
      // Ensure only one default per clerk user
      await tx
        .update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.clerkUserId, clerkUserId));

      await tx.insert(customerAddresses).values(addr);
    });

    return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders() });
  } catch (err: any) {
    const msg = String(err?.message || "Webhook error");
    return NextResponse.json({ error: msg }, { status: 400, headers: noStoreHeaders() });
  }
}
