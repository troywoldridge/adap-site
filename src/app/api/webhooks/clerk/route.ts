import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerAddresses } from "@/db/schema/customerAddresses";
// import { customers } from "@/db/schema/customer"; // if you upsert a customer too

export async function POST(req: Request) {
  const evt = await req.json(); // verify with Clerk signing secret in your real code
  if (evt.type !== "user.created") return NextResponse.json({ ok: true });

  const user = evt.data;
  const clerkUserId = user.id as string;

  // If you collect address fields on sign-up, pass them in metadata
  const m = user?.public_metadata ?? {};
  const addr = {
    clerkUserId,
    // customerId: ...,  // if you created a customers row, put its id here
    label: "Default",
    firstName: (user.first_name as string) ?? null,
    lastName: (user.last_name as string) ?? null,
    company: (m.company as string) ?? null,
    phone: (user.phone_numbers?.[0]?.phone_number as string) ?? null,
    street1: (m.street1 as string) ?? "—",
    street2: (m.street2 as string) ?? null,
    city: (m.city as string) ?? "—",
    state: (m.state as string) ?? "—",
    postalCode: (m.postalCode as string) ?? "—",
    country: ((m.country as string) ?? "US").toUpperCase(),
    isDefault: true,
  };

  // Ensure only one default per user
  await db.transaction(async (tx) => {
    await tx
      .update(customerAddresses)
      .set({ isDefault: false })
      .where(customerAddresses.clerkUserId.eq(clerkUserId));
    await tx.insert(customerAddresses).values(addr);
  });

  return NextResponse.json({ ok: true });
}
