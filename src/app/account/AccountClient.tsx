"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

/**
 * IMPORTANT INTEGRATION NOTES
 * -------------------------------------------------------
 * • Orders & tracking: This UI expects your existing endpoints to proxy SinaLite
 *   where appropriate (per SinaLite API documentation). For example:
 *      GET  /api/me/orders                -> combines local orders + SinaLite refs
 *      GET  /api/me/shipments?orderId=..  -> returns tracking numbers/status
 *
 * • Rewards: Expects an endpoint that returns the user’s loyalty wallet/points:
 *      GET  /api/me/loyalty
 *
 * • Addresses (address book):
 *      GET    /api/me/addresses
 *      POST   /api/me/addresses
 *      PUT    /api/me/addresses/:id
 *      DELETE /api/me/addresses/:id
 *
 * Cloudflare Images:
 *   All avatars/badges are served via your Cloudflare Image Delivery (CDN) variants.
 *   Replace NEXT_PUBLIC_CF_IMAGES_HASH if needed.
 */

/* ───────────────────────── helpers ───────────────────────── */

const CF_ACCOUNT_HASH =
  process.env.NEXT_PUBLIC_CF_IMAGES_HASH || "YOUR_CF_HASH";

/** Build a Cloudflare Images URL: https://imagedelivery.net/<HASH>/<id>/<variant> */
function cfUrl(id?: string | null, variant: string = "public"): string {
  return id
    ? `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${id}/${variant}`
    : `https://imagedelivery.net/${CF_ACCOUNT_HASH}/public-placeholder/${variant}`;
}

type OrderRow = {
  id: string | number;
  createdAt: string;
  status: "placed" | "processing" | "fulfilled" | "cancelled" | string;
  total: number; // dollars
  currency: "USD" | "CAD";
  sinaOrderId?: string | number | null; // links to SinaLite order when applicable
  name?: string; // product/order label
};

type Shipment = {
  carrier: string;
  trackingNumber: string;
  status: string;
  eta?: string | null;
  events?: { time: string; description: string; location?: string }[];
};

type Rewards = {
  points: number;
  tier?: "Bronze" | "Silver" | "Gold" | "Platinum" | string;
  nextTierAt?: number; // points to next tier
};

type Address = {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: "US" | "CA";
  phone?: string;
  isDefault?: boolean;
};

type Me = {
  firstName?: string;
  lastName?: string;
  email: string;
  avatarCfId?: string | null; // Cloudflare Image ID for avatar
  company?: string;
};

type LoyaltySnapshot = {
  balance: number;
  points: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  nextTierAt: number | null;
};
type LoyaltyAPI = { wallet: LoyaltySnapshot; transactions: any[] };

/* ───────────────────────── fetchers ───────────────────────── */

async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${url}`);
  return res.json();
}

function money(amount: number, currency: "USD" | "CAD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const STATUS_STYLES: Record<
  string,
  { bg: string; ring: string; text: string }
> = {
  fulfilled: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
  },
  processing: {
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    text: "text-amber-800",
  },
  cancelled: {
    bg: "bg-rose-50",
    ring: "ring-rose-200",
    text: "text-rose-700",
  },
  placed: {
    bg: "bg-indigo-50",
    ring: "ring-indigo-200",
    text: "text-indigo-700",
  },
  default: {
    bg: "bg-gray-50",
    ring: "ring-gray-200",
    text: "text-gray-700",
  },
};

/* ───────────────────────── UI ───────────────────────── */

export default function AccountClient() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "orders" | "tracking" | "rewards" | "addresses" | "profile" | "security"
  >("overview");

  // Core data
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    try {
      setErr(null);
      setLoading(true);

      const [m, o, l, a] = await Promise.all([
        getJSON<Me>("/api/me"),
        getJSON<{ orders: OrderRow[] }>("/api/me/orders"),
        getJSON<LoyaltyAPI>("/api/me/loyalty"),
        getJSON<{ addresses: Address[] }>("/api/me/addresses"),
      ]);

      setMe(m);
      setOrders(o.orders);

      // map API view model → UI rewards shape (and fix type complaint)
      setRewards({
        points: l.wallet.points,
        tier: l.wallet.tier,
        nextTierAt: l.wallet.nextTierAt ?? undefined,
      });

      setAddresses(a.addresses);
    } catch (e: any) {
      setErr(e?.message || "Failed to load account data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const fullName = useMemo(() => {
    if (!me) return "";
    const fn = me.firstName?.trim();
    const ln = me.lastName?.trim();
    return [fn, ln].filter(Boolean).join(" ") || me.email;
  }, [me]);

  return (
    <div className="space-y-8">
      {/* HERO: glassy gradient frame */}
      <HeroHeader
        loading={loading}
        avatarUrl={cfUrl(me?.avatarCfId, "avatar")}
        name={fullName || "Your Account"}
        email={me?.email || ""}
        company={me?.company}
        rewards={rewards}
        ordersCount={orders?.length ?? 0}
        defaultAddress={addresses?.find((a) => a.isDefault)}
        onRefresh={refreshAll}
        err={err}
      />

      {/* Tabs */}
      <Tabs active={activeTab} onChange={setActiveTab} />

      {/* Panels */}
      <div className="rounded-3xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur">
        {loading ? (
          <SkeletonPanels />
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewPanel orders={orders} rewards={rewards} addresses={addresses} />
            )}
            {activeTab === "orders" && <OrdersPanel orders={orders} />}
            {activeTab === "tracking" && <TrackingPanel orders={orders} />}
            {activeTab === "rewards" && <RewardsPanel rewards={rewards} />}
            {activeTab === "addresses" && (
              <AddressesPanel addresses={addresses} onChange={setAddresses} />
            )}
            {activeTab === "profile" && <ProfilePanel me={me} onSaved={refreshAll} />}
            {activeTab === "security" && <SecurityPanel />}
          </>
        )}
      </div>
    </div>
  );
}

/* ────────── Luxe hero with KPIs + progress ────────── */

function HeroHeader(props: {
  loading: boolean;
  avatarUrl: string;
  name: string;
  email: string;
  company?: string;
  rewards: Rewards | null;
  ordersCount: number;
  defaultAddress?: Address;
  onRefresh: () => void;
  err: string | null;
}) {
  const { loading, avatarUrl, name, email, company, rewards, ordersCount, defaultAddress, onRefresh, err } =
    props;

  const tier = rewards?.tier ?? "Bronze";
  const nextTierAt = rewards?.nextTierAt ?? 0;
  const points = rewards?.points ?? 0;
  const progressPct =
    nextTierAt && nextTierAt > 0 ? Math.min(100, Math.round((points / nextTierAt) * 100)) : 100;

  return (
    <section className="relative rounded-3xl border border-transparent bg-gradient-to-br from-indigo-500 via-indigo-400 to-blue-500 p-[1px] shadow-lg">
      <div className="relative overflow-hidden rounded-3xl bg-white/90 p-6 sm:p-8">
        {/* background grid accent */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(0,0,0,.06)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,0,.06)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: identity */}
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-16 w-16 rounded-2xl border border-gray-200 object-cover shadow-sm"
              loading="lazy"
              decoding="async"
            />
            <div>
              <div className="flex items-center gap-2">
                <div className="text-lg font-semibold text-gray-900">{name}</div>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
                  {tier} Tier
                </span>
              </div>
              <div className="text-sm text-gray-600">{email}</div>
              {company && <div className="text-sm text-gray-500">{company}</div>}
            </div>
          </div>

          {/* Right: KPIs */}
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-3">
            <Kpi
              title="Orders"
              value={ordersCount}
              hint="All-time"
              gradient
            />
            <Kpi
              title="Rewards"
              value={points.toLocaleString()}
              hint={rewards?.tier ? `Tier • ${rewards.tier}` : "Loyalty points"}
              gradient
            />
            <Kpi
              title="Default Ship To"
              value={
                defaultAddress
                  ? `${defaultAddress.city}, ${defaultAddress.state}`
                  : "Add one"
              }
              hint={defaultAddress?.country || ""}
            />
          </div>
        </div>

        {/* Progress to next tier */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Progress to next tier</span>
            <span>
              {nextTierAt
                ? `${points.toLocaleString()} / ${nextTierAt.toLocaleString()} pts`
                : "Max tier"}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-[width]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-6 flex items-center justify-between">
          <div className="min-h-[1.25rem] text-sm text-rose-600">{err}</div>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Kpi({
  title,
  value,
  hint,
  gradient = false,
}: {
  title: string;
  value: string | number;
  hint?: string;
  gradient?: boolean;
}) {
  return (
    <div
      className={cls(
        "rounded-2xl border p-4 text-center shadow-sm",
        gradient && "border-transparent bg-gradient-to-br from-gray-50 to-white"
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

/* ────────── Tabs ────────── */

function Tabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (k: any) => void;
}) {
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "orders", label: "Orders" },
    { key: "tracking", label: "Tracking" },
    { key: "rewards", label: "Rewards" },
    { key: "addresses", label: "Addresses" },
    { key: "profile", label: "Profile" },
    { key: "security", label: "Security" },
  ] as const;

  return (
    <nav className="overflow-x-auto">
      <ul className="inline-flex min-w-full items-center gap-2 rounded-2xl border bg-white p-2 shadow-sm">
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <li key={t.key}>
              <button
                onClick={() => onChange(t.key)}
                className={cls(
                  "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ────────── Panels ────────── */

function OverviewPanel({
  orders,
  rewards,
  addresses,
}: {
  orders: OrderRow[] | null;
  rewards: Rewards | null;
  addresses: Address[] | null;
}) {
  const recent = (orders ?? []).slice(0, 5);

  return (
    <div className="p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <SectionTitle title="Recent orders" href="/account?tab=orders" />
          <div className="mt-3 overflow-hidden rounded-2xl border">
            <OrdersTable rows={recent} emptyText="No orders yet." />
          </div>
        </div>

        {/* Rewards card */}
        <div>
          <SectionTitle title="Loyalty rewards" href="/rewards" />
          <div className="mt-3 rounded-2xl border p-5">
            <div className="text-4xl font-bold text-indigo-700">
              {(rewards?.points ?? 0).toLocaleString()}
            </div>
            <div className="mt-1 text-sm text-gray-600">Points available</div>
            {rewards?.tier && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-800 ring-1 ring-inset ring-indigo-100">
                Tier: <strong>{rewards.tier}</strong>
                {rewards.nextTierAt ? (
                  <span className="text-indigo-600">
                    • Next at {rewards.nextTierAt.toLocaleString()} pts
                  </span>
                ) : null}
              </div>
            )}
            <a
              className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
              href="/rewards"
            >
              Redeem rewards
            </a>
          </div>
        </div>

        {/* Address book */}
        <div className="lg:col-span-3">
          <SectionTitle title="Address book" href="/account?tab=addresses" />
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(addresses ?? []).map((a) => (
              <AddressCard key={a.id} a={a} />
            ))}
            {(addresses ?? []).length === 0 && (
              <div className="rounded-2xl border p-6 text-sm text-gray-600">
                No addresses yet. Add your first shipping address to speed up checkout.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {href && (
        <a className="text-sm font-medium text-indigo-700 hover:underline" href={href}>
          View all
        </a>
      )}
    </div>
  );
}

function AddressCard({ a }: { a: Address }) {
  return (
    <div className="rounded-2xl border p-4 text-sm">
      <div className="font-medium text-gray-900">{a.name}</div>
      <div className="text-gray-700">
        {a.line1}
        {a.line2 ? <span>, {a.line2}</span> : null}
      </div>
      <div className="text-gray-700">
        {a.city}, {a.state} {a.postalCode}
      </div>
      <div className="text-gray-500">{a.country}</div>
      {a.isDefault && (
        <div className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
          Default
        </div>
      )}
    </div>
  );
}

/* Orders Panel — with search, filter, load more */

function OrdersPanel({ orders }: { orders: OrderRow[] | null }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<
    "all" | "placed" | "processing" | "fulfilled" | "cancelled"
  >("all");
  const [visible, setVisible] = useState(10);

  const rows = useMemo(() => {
    let list = (orders ?? []).slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (status !== "all") list = list.filter((r) => String(r.status).toLowerCase() === status);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((r) =>
        [String(r.id), r.name, r.sinaOrderId?.toString()]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(needle))
      );
    }
    return list;
  }, [orders, q, status]);

  const paged = rows.slice(0, visible);

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-900">All orders</h3>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
            <span className="text-xs text-gray-500">Search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.currentTarget.value)}
              placeholder="#ID, name, ref…"
              className="w-40 text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Status filter */}
          <div className="rounded-xl border bg-white p-1">
            {(["all", "placed", "processing", "fulfilled", "cancelled"] as const).map((s) => {
              const active = status === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cls(
                    "rounded-lg px-3 py-1 text-xs font-medium",
                    active ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border">
        <OrdersTable rows={paged} emptyText="No orders yet." />
      </div>

      {rows.length > visible && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisible((v) => v + 10)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
          >
            Load more
          </button>
        </div>
      )}

      <p className="mt-6 text-xs text-gray-500">
        Live order details & tracking are fetched through your backend using the
        latest <strong>SinaLite API</strong> endpoints and merged with local order data.
      </p>
    </div>
  );
}

function OrdersTable({
  rows,
  emptyText,
}: {
  rows: OrderRow[];
  emptyText?: string;
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-gray-600">{emptyText}</div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur">
          <tr>
            <Th>Order</Th>
            <Th>Date</Th>
            <Th>Status</Th>
            <Th className="text-right">Total</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const style = STATUS_STYLES[r.status] || STATUS_STYLES.default;
            return (
              <tr key={String(r.id)} className="hover:bg-gray-50/60">
                <Td>
                  <div className="font-medium text-gray-900">#{r.id}</div>
                  {r.sinaOrderId && (
                    <div className="text-xs text-gray-500">
                      SinaLite Ref: {String(r.sinaOrderId)}
                    </div>
                  )}
                  {r.name && <div className="text-xs text-gray-600">{r.name}</div>}
                </Td>
                <Td>{new Date(r.createdAt).toLocaleDateString()}</Td>
                <Td>
                  <span
                    className={cls(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                      style.bg,
                      style.ring,
                      style.text
                    )}
                  >
                    {r.status}
                  </span>
                </Td>
                <Td className="text-right font-semibold text-gray-900">
                  {money(r.total, r.currency)}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/account/orders/${r.id}`}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                    >
                      View
                    </a>
                    <a
                      href={`/account/orders/${r.id}/invoice`}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
                    >
                      Invoice
                    </a>
                    <a
                      href={`/account/orders/${r.id}/reorder`}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      Reorder
                    </a>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }: any) {
  return (
    <th
      scope="col"
      className={cls(
        "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600",
        className
      )}
    >
      {children}
    </th>
  );
}
function Td({ children, className = "" }: any) {
  return <td className={cls("px-4 py-3 align-top", className)}>{children}</td>;
}

/* Tracking Panel */

function TrackingPanel({ orders }: { orders: OrderRow[] | null }) {
  const [selectedOrder, setSelectedOrder] = useState<string | number | null>(
    orders?.[0]?.id ?? null
  );
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (orderId: string | number | null) => {
    if (!orderId) return;
    try {
      setErr(null);
      setLoading(true);
      // Backend should fetch latest tracking from SinaLite as needed.
      const data = await getJSON<{ shipments: Shipment[] }>(
        `/api/me/shipments?orderId=${orderId}`
      );
      setShipments(data.shipments);
    } catch (e: any) {
      setErr(e?.message || "Failed to load tracking");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedOrder);
  }, [load, selectedOrder]);

  const orderOptions = (orders ?? []).map((o) => ({
    id: o.id,
    label: `#${o.id} • ${new Date(o.createdAt).toLocaleDateString()} • ${o.status}`,
  }));

  return (
    <div className="p-6 sm:p-8">
      <h3 className="text-base font-semibold text-gray-900">Tracking</h3>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-700" htmlFor="ordSel">
          Select order:
        </label>
        <select
          id="ordSel"
          value={String(selectedOrder ?? "")}
          onChange={(e) => setSelectedOrder(e.currentTarget.value)}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          {orderOptions.map((o) => (
            <option key={String(o.id)} value={String(o.id)}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => void load(selectedOrder)}
          className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>

      {err && <div className="mt-4 text-sm text-rose-600">{err}</div>}
      {loading && <div className="mt-6 text-sm text-gray-600">Loading…</div>}

      <div className="mt-6 grid grid-cols-1 gap-4">
        {(shipments ?? []).map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border p-4 shadow-sm ring-1 ring-inset ring-gray-100"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-900">
                {s.carrier} • {s.trackingNumber}
              </div>
              <div className="text-xs text-gray-600">
                Status:{" "}
                <span className="rounded-md bg-gray-100 px-2 py-0.5">
                  {s.status}
                </span>
                {s.eta ? ` • ETA ${s.eta}` : ""}
              </div>
            </div>
            {s.events && s.events.length > 0 && (
              <ol className="mt-3 space-y-2 text-sm text-gray-700">
                {s.events.map((e, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-gray-400" />
                    <div>
                      <div className="text-gray-900">{e.description}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(e.time).toLocaleString()}
                        {e.location ? ` • ${e.location}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
        {(shipments ?? []).length === 0 && !loading && (
          <div className="rounded-2xl border p-6 text-sm text-gray-600">
            No tracking details for this order yet.
          </div>
        )}
      </div>
    </div>
  );
}

/* Rewards Panel */

function RewardsPanel({ rewards }: { rewards: Rewards | null }) {
  const points = rewards?.points ?? 0;
  const nextTierAt = rewards?.nextTierAt ?? 0;
  const pct = nextTierAt ? Math.min(100, Math.round((points / nextTierAt) * 100)) : 100;

  return (
    <div className="p-6 sm:p-8">
      <h3 className="text-base font-semibold text-gray-900">Loyalty rewards</h3>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border p-6">
          <div className="text-5xl font-bold text-indigo-700">
            {points.toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-gray-600">Points available</div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
            <span>Progress to next tier</span>
            <span>
              {nextTierAt ? `${points.toLocaleString()} / ${nextTierAt.toLocaleString()} pts` : "Max tier"}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>

          {rewards?.tier && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-800 ring-1 ring-inset ring-indigo-100">
              Tier: <strong>{rewards.tier}</strong>
            </div>
          )}
          <a
            href="/rewards"
            className="mt-5 inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Redeem rewards
          </a>
        </div>

        <div className="rounded-2xl border p-6">
          <h4 className="text-sm font-semibold text-gray-900">How it works</h4>
          <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
            <li>Earn points on every purchase (aligned with SinaLite invoice life cycle).</li>
            <li>Bonus multipliers on select categories.</li>
            <li>Redeem points during checkout or on the Rewards page.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* Addresses Panel */

function AddressesPanel({
  addresses,
  onChange,
}: {
  addresses: Address[] | null;
  onChange: (a: Address[]) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Address>>({
    name: "",
    line1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    phone: "",
  });

  const submit = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/me/addresses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save address");
      const { addresses: updated } = (await res.json()) as { addresses: Address[] };
      onChange(updated);
      setForm({
        name: "",
        line1: "",
        city: "",
        state: "",
        postalCode: "",
        country: "US",
        phone: "",
      });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const yes = confirm("Remove this address?");
    if (!yes) return;
    const res = await fetch(`/api/me/addresses/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      const { addresses: updated } = (await res.json()) as { addresses: Address[] };
      onChange(updated);
    }
  };

  const setDefault = async (id: string) => {
    const res = await fetch(`/api/me/addresses/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) {
      const { addresses: updated } = (await res.json()) as { addresses: Address[] };
      onChange(updated);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <h3 className="text-base font-semibold text-gray-900">Addresses</h3>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(addresses ?? []).map((a) => (
          <div key={a.id} className="flex flex-col justify-between rounded-2xl border p-4">
            <div>
              <div className="font-semibold text-gray-900">{a.name}</div>
              <div className="text-sm text-gray-700">
                {a.line1}
                {a.line2 ? <span>, {a.line2}</span> : null}
              </div>
              <div className="text-sm text-gray-700">
                {a.city}, {a.state} {a.postalCode}
              </div>
              <div className="text-xs text-gray-500">{a.country}</div>
              {a.phone && <div className="text-xs text-gray-500">{a.phone}</div>}
              {a.isDefault && (
                <div className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
                  Default
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {!a.isDefault && (
                <button
                  onClick={() => void setDefault(a.id)}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
                >
                  Make default
                </button>
              )}
              <button
                onClick={() => void remove(a.id)}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new address */}
      <div className="mt-8 rounded-2xl border p-5">
        <h4 className="text-sm font-semibold text-gray-900">Add a new address</h4>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Name" value={form.name ?? ""} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Input label="Phone" value={form.phone ?? ""} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
          <Input label="Address line 1" value={form.line1 ?? ""} onChange={(v) => setForm((f) => ({ ...f, line1: v }))} />
          <Input label="Address line 2" value={form.line2 ?? ""} onChange={(v) => setForm((f) => ({ ...f, line2: v }))} />
          <Input label="City" value={form.city ?? ""} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
          <Input label="State/Province" value={form.state ?? ""} onChange={(v) => setForm((f) => ({ ...f, state: v }))} />
          <Input label="Postal code" value={form.postalCode ?? ""} onChange={(v) => setForm((f) => ({ ...f, postalCode: v }))} />
          <Select
            label="Country"
            value={form.country ?? "US"}
            onChange={(v) => setForm((f) => ({ ...f, country: v as "US" | "CA" }))}
            options={[
              { label: "United States", value: "US" },
              { label: "Canada", value: "CA" },
            ]}
          />
        </div>

        <div className="mt-4">
          <button
            onClick={() => void submit()}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save address"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Profile Panel */

function ProfilePanel({ me, onSaved }: { me: Me | null; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Me>>({
    firstName: me?.firstName ?? "",
    lastName: me?.lastName ?? "",
    company: me?.company ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/me", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      onSaved();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <h3 className="text-base font-semibold text-gray-900">Profile</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:max-w-lg">
        <Input label="First name" value={form.firstName ?? ""} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
        <Input label="Last name" value={form.lastName ?? ""} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
        <Input label="Company" value={form.company ?? ""} onChange={(v) => setForm((f) => ({ ...f, company: v }))} />
      </div>
      <div className="mt-4">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-70"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

/* Security Panel (password, 2FA links) */

function SecurityPanel() {
  return (
    <div className="p-6 sm:p-8">
      <h3 className="text-base font-semibold text-gray-900">Security</h3>
      <div className="mt-4 rounded-2xl border p-6 text-sm text-gray-700">
        <p>
          For password, sessions, and 2-factor authentication, visit{" "}
          <a className="text-indigo-700 underline" href="/account/security/manage">
            Security Settings
          </a>
          .
        </p>
        <p className="mt-2">
          We strongly recommend enabling 2FA for enhanced account protection.
        </p>
      </div>
    </div>
  );
}

/* Small form inputs */

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="rounded-xl border px-3 py-2"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="rounded-xl border px-3 py-2"
      >
        {options.map((o) => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* Skeletons */

function SkeletonPanels() {
  return (
    <div className="p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
        </div>
        <div className="lg:col-span-3 space-y-3">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
