"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ShippingRate = {
  carrier: string;
  serviceCode: string;
  serviceName: string;
  amount: number;
  currency: "USD" | "CAD";
  eta?: string | null;
  days?: number | null;
};

function parseDays(rate: ShippingRate): number | null {
  if (typeof rate.days === "number") return rate.days;
  const m = rate.eta?.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function money(n: number, currency: "USD" | "CAD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

/** Safely parse JSON; if server sent HTML/text, surface readable error text. */
async function parseJsonSafe(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  throw new Error(text?.slice(0, 200) || `HTTP ${res.status}`);
}

export default function CartShippingEstimator() {
  const router = useRouter();

  const [country, setCountry] = useState<"US" | "CA">("US");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selected, setSelected] = useState<number>(-1);

  const cheapestIdx = useMemo(() => {
    if (!rates.length) return -1;
    let idx = 0, min = rates[0].amount;
    for (let i = 1; i < rates.length; i++) if (rates[i].amount < min) { min = rates[i].amount; idx = i; }
    return idx;
  }, [rates]);

  const getRates = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      // Sinalite API: POST /order/shippingEstimate
      const res = await fetch("/api/cart/estimate-shipping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shipCountry: country, shipState: state, shipZip: zip }),
        cache: "no-store",
      });

      const data = await parseJsonSafe(res);
      if (!res.ok || !data.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const list: ShippingRate[] = (data.rates || []).map((r: ShippingRate) => ({
        ...r,
        days: parseDays(r),
      }));
      setRates(list);
      setSelected(list.length ? 0 : -1);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch rates");
    } finally {
      setLoading(false);
    }
  }, [country, state, zip]);

  const applySelected = useCallback(async () => {
    if (selected < 0 || !rates[selected]) return;
    setSaving(true);
    setError(null);
    try {
      const r = rates[selected];
      const res = await fetch("/api/cart/choose-shipping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          carrier: r.carrier,
          method: r.serviceName || r.serviceCode,
          amount: r.amount,
          currency: r.currency,
          days: parseDays(r),
          country,
          state,
          zip,
        }),
      });

      const data = await parseJsonSafe(res);
      if (!res.ok || !data.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      router.refresh(); // Review page totals update with selectedShipping
    } catch (e: any) {
      setError(e?.message || "Failed to save shipping");
    } finally {
      setSaving(false);
    }
  }, [selected, rates, country, state, zip, router]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header / inputs */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 min-w-[110px] rounded-lg border border-gray-300 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-600"
            value={country}
            onChange={(e) => setCountry(e.target.value as "US" | "CA")}
            aria-label="Destination country"
          >
            <option value="US">US</option>
            <option value="CA">CA</option>
          </select>
          <input
            className="h-10 w-24 rounded-lg border border-gray-300 px-3 text-sm uppercase outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            placeholder={country === "US" ? "State" : "Prov"}
            maxLength={2}
            aria-label="State/Province"
          />
          <input
            className="h-10 w-32 rounded-lg border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="ZIP/Postal"
            aria-label="ZIP/Postal code"
          />
        </div>
        <button
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50"
          onClick={getRates}
          disabled={loading}
        >
          {loading ? "Getting rates…" : "Get Rates"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Rates list */}
      {!!rates.length && (
        <ul className="mt-4 space-y-3">
          {rates.map((r, i) => {
            const isBest = i === cheapestIdx;
            return (
              <li key={`${r.carrier}-${r.serviceName}-${i}`}>
                <label className="block">
                  <input
                    type="radio"
                    name="ship-rate"
                    className="peer sr-only"
                    checked={selected === i}
                    onChange={() => setSelected(i)}
                  />
                  <div
                    className="
                      grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-gray-200 bg-gray-50
                      p-3 transition hover:bg-gray-100
                      peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:ring-2 peer-checked:ring-blue-600
                    "
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.carrier}</span>
                        <span className="text-gray-400">—</span>
                        <span className="truncate">{r.serviceName || r.serviceCode}</span>
                        {isBest && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Best price
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                          {parseDays(r) ?? 0} business {parseDays(r) === 1 ? "day" : "days"}
                        </span>
                      </div>
                    </div>
                    <div className="self-center text-right text-base font-bold">
                      {money(r.amount, r.currency)}
                    </div>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer actions */}
      {!!rates.length && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 px-3 text-sm font-semibold text-gray-900 hover:bg-gray-200 disabled:opacity-50"
            onClick={() => setRates([])}
            disabled={loading || saving}
          >
            Clear
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50"
            onClick={applySelected}
            disabled={selected < 0 || saving}
          >
            {saving ? "Saving…" : "Apply Shipping"}
          </button>
        </div>
      )}
    </section>
  );
}
