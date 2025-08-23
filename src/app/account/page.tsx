import { headers, cookies } from "next/headers";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

async function baseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function AccountPage() {
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const res = await fetch(`${await baseUrl()}/api/me/orders?page=1&pageSize=20`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });

  let orders: any[] = [];
  try {
    const json = await res.json();
    if (json?.ok && Array.isArray(json.orders)) orders = json.orders;
  } catch {
    /* ignore */
  }

  return <AccountClient initialOrders={orders} />;
}
