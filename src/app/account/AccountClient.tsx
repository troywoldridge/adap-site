"use client";

import React from "react";
import useSWR from "swr";
import Link from "next/link";

type ApiOrderRow = {
  id: number | string;
  status?: string | null;
  total?: number | string | null;
  tax?: number | string | null;
  discount?: number | string | null;
  externalId?: string | null;  // Sinalite orderId (if stored)
  cartId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Our convenience JSON (added in /api/orders/place)
  itemsJson?: string | null;
  shippingJson?: string | null;
  notes?: string | null;
  // Optional email-based claim column
  customerEmail?: string | null;
};

type ApiMeOrders =
  | { ok: true; page: number; pageSize: number; orders: ApiOrderRow[] }
  | { ok: false; error: string };

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json());

function fmtMoney(n: unknown, currency: "USD" | "CAD" = "USD") {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return `${currency} 0.00`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
}

function shortDate(s?: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return s ?? "—";
  }
}

function parseItems(itemsJson?: string | null): Array<{ productId?: number; qty?: number }> {
  try {
    const parsed = JSON.parse(itemsJson || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x: any) => ({
      productId: Number(x?.productId),
      // quantity is not included in the order payload items we sent to Sinalite;
      // we can infer later by reading cartLines in an order details page.
      qty: Number(x?.quantity) || undefined,
    }));
  } catch {
    return [];
  }
}

export default function AccountClient() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [view, setView] = React.useState<"detailed" | "compact">("detailed");
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");

  const { data, error, isLoading, mutate } = useSWR<ApiMeOrders>(
    `/api/me/orders?page=${page}&pageSize=${pageSize}`,
    fetcher
  );

  const rows: ApiOrderRow[] = React.useMemo(() => {
    const src = data && "ok" in data && data.ok ? data.orders : [];
    const q = query.trim().toLowerCase();
    const f = statusFilter.trim().toLowerCase();

    return src.filter((o) => {
      const candidate =
        `${o.id}`.toLowerCase() +
        ` ${o.externalId ?? ""}`.toLowerCase() +
        ` ${o.status ?? ""}`.toLowerCase() +
        ` ${o.cartId ?? ""}`.toLowerCase();
      const passQ = q ? candidate.includes(q) : true;
      const passF = f ? (o.status ?? "").toLowerCase() === f : true;
      return passQ && passF;
    });
  }, [data, query, statusFilter]);

  function statusClass(s?: string | null) {
    const k = (s || "").toLowerCase();
    if (k.includes("new") || k.includes("submitted")) return "badge badge--new";
    if (k.includes("processing") || k.includes("in_progress")) return "badge badge--inprog";
    if (k.includes("shipped")) return "badge badge--shipped";
    if (k.includes("delivered") || k.includes("completed")) return "badge badge--done";
    if (k.includes("canceled") || k.includes("cancelled")) return "badge badge--cancel";
    return "badge";
  }

  async function onReorder(orderId: string | number) {
    try {
      const res = await fetch(`/api/orders/${orderId}/reorder`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Reorder failed (${res.status})`);
      }
      // The API could return a new cart id or redirect URL.
      // Minimal: just refresh cart badge or show toast.
      alert("Items moved to your cart.");
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  const content = (() => {
    if (isLoading) {
      return (
        <div className="orders__skeleton">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="orders__skeletonRow" key={i} />
          ))}
        </div>
      );
    }
    if (error || !data || ("ok" in data && !data.ok)) {
      const msg = (error as any)?.message || (data as any)?.error || "Failed to load orders.";
      return <div className="orders__error">{msg}</div>;
    }
    if (rows.length === 0) {
      return (
        <div className="orders__empty">
          <div className="orders__emptyTitle">No orders yet</div>
          <p className="orders__emptyText">
            Once you place an order, it’ll show up here with tracking, invoices, and quick re-order.
          </p>
          <Link href="/" className="btn btn--primary orders__emptyCta">Shop products</Link>
        </div>
      );
    }

    return (
      <ul className={`orders ${view === "compact" ? "orders--compact" : ""}`}>
        {rows.map((o) => {
          const items = parseItems(o.itemsJson);
          const first = items[0];
          return (
            <li key={o.id} className="orderCard">
              <div className="orderCard__head">
                <div className="orderCard__headLeft">
                  <div className="orderCard__id">
                    <span className="orderCard__label">Order</span>
                    <span className="orderCard__value">#{o.id}</span>
                    {o.externalId ? (
                      <span className="orderCard__ext">• Sinalite #{o.externalId}</span>
                    ) : null}
                  </div>
                  <div className="orderCard__date">{shortDate(o.createdAt)}</div>
                </div>
                <div className="orderCard__headRight">
                  <span className={statusClass(o.status)}>{o.status ?? "—"}</span>
                </div>
              </div>

              <div className="orderCard__body">
                <div className="orderCard__summary">
                  <div className="orderCard__summaryLine">
                    <span className="muted">Items</span>
                    <span className="strong">
                      {items.length === 0
                        ? "—"
                        : `${items.length} item${items.length > 1 ? "s" : ""}` }
                    </span>
                  </div>
                  <div className="orderCard__summaryLine">
                    <span className="muted">Total (excl. tax)</span>
                    <span className="strong">{fmtMoney(o.total ?? 0)}</span>
                  </div>
                </div>

                <div className="orderCard__actions">
                  <Link className="btn btn--secondary" href={`/orders/${o.id}`}>
                    View details
                  </Link>
                  <button className="btn btn--ghost" onClick={() => onReorder(o.id)}>
                    Re-order
                  </button>
                </div>
              </div>

              {view === "detailed" && items.length > 0 && (
                <div className="orderCard__items">
                  <div className="orderCard__itemsHead">Quick glance</div>
                  <ul className="orderCard__itemList">
                    {items.slice(0, 4).map((it, idx) => (
                      <li key={idx} className="orderItem">
                        <div className="orderItem__thumb" aria-hidden />
                        <div className="orderItem__meta">
                          <div className="orderItem__title">Product #{it.productId ?? "—"}</div>
                          {typeof it.qty === "number" ? (
                            <div className="orderItem__sub">Qty: {it.qty}</div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {items.length > 4 ? (
                    <div className="orderCard__more">+ {items.length - 4} more item(s)</div>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  })();

  return (
    <div className="ordersWrap">
      {/* Controls */}
      <div className="ordersToolbar">
        <div className="ordersToolbar__left">
          <input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search orders (order ID, Sinalite ID, status)…"
            className="input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.currentTarget.value)}
            className="select"
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
          <select
            value={view}
            onChange={(e) => setView(e.currentTarget.value as any)}
            className="select"
          >
            <option value="detailed">Detailed view</option>
            <option value="compact">Compact view</option>
          </select>
        </div>
        <div className="ordersToolbar__right">
          <label className="ordersToolbar__pageSize">
            <span>Per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.currentTarget.value));
              }}
              className="select"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div className="pager">
            <button
              className="btn btn--ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="pager__num">Page {page}</span>
            <button
              className="btn btn--ghost"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
          <button className="btn btn--secondary" onClick={() => mutate()}>
            Refresh
          </button>
        </div>
      </div>

      {content}
    </div>
  );
}
