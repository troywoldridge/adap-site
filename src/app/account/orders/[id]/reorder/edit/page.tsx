import "server-only";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/db/schema/orders";
import { cartLines } from "@/db/schema/cartLines";
import ReorderEditor from "./ReorderEditor";

export const dynamic = "force-dynamic";

async function load(orderId: string) {
  const { userId } = await auth();
  const jar = await cookies();
  const sid = jar.get("adap_sid")?.value ?? jar.get("sid")?.value ?? null;

  const [o] = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)) ?? [];
  if (!o) return null;

  if (userId && o.userId === sid) {
    await db.update(orders).set({ userId }).where(eq(orders.id, orderId));
    (o as any).userId = userId;
  }
  if (![userId, sid].filter(Boolean).includes(o.userId)) return null;

  const lines = o.cartId
    ? await db
        .select({
          productId: cartLines.productId,
          quantity: cartLines.quantity,
          unitPriceCents: cartLines.unitPriceCents,
        })
        .from(cartLines)
        .where(eq(cartLines.cartId, o.cartId as string))
    : [];

  return { orderId, lines, currency: o.currency as "USD" | "CAD" };
}

export default async function Page({ params }: { params: { id: string } }) {
  const data = await load(params.id);
  if (!data) notFound();
  return <ReorderEditor {...data} />;
}
