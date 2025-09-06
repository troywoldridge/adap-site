"use client";
import * as React from "react";

export default function LoyaltyRedeemer({
  balance,
  currency,
  onChange,
}: {
  balance: number;                 // available points
  currency: "USD" | "CAD";
  onChange?: (points: number) => void; // optional: parent can react to slider changes
}) {
  const MIN_REDEEM = 100;          // business rule: 100 pts = $1
  const STEP = 100;

  const [points, setPoints] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  const dollars = points / 100; // 100 pts = $1
  const canRedeem =
    points >= MIN_REDEEM &&
    points <= balance &&
    points % STEP === 0 &&
    !busy;

  async function redeem() {
    try {
      setBusy(true);
      setMsg(null);

      // 1) Redeem points -> server validates and returns { credit, wallet }
      const res = await fetch("/api/me/loyalty/redeem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Redeem failed");

      // 2) Apply the returned credit (in dollars) to the cart
      await fetch("/api/cart/apply-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: data.credit }), // dollars
      });

      setMsg(
        `Redeemed ${points.toLocaleString()} pts for ${fmtMoney(
          data.credit
        )}. Credit applied to your cart.`
      );

      // Reset slider and notify parent if needed
      setPoints(0);
      onChange?.(0);
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong while redeeming points.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border p-5">
      <div className="text-sm text-gray-700">
        Available: <b>{balance.toLocaleString()}</b> pts
      </div>
      <div className="mt-1 text-xs text-gray-500">100 pts = {fmtMoney(1)}</div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={balance}
        step={STEP}
        value={points}
        onChange={(e) => {
          const v = Math.min(balance, Math.max(0, Number(e.currentTarget.value) || 0));
          setPoints(v);
          onChange?.(v);
        }}
        className="mt-4 w-full"
      />

      {/* Numeric input (optional quick edits) */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={balance}
          step={STEP}
          value={points}
          onChange={(e) => {
            let v = Math.floor(Number(e.currentTarget.value) || 0);
            if (v % STEP !== 0) v = Math.round(v / STEP) * STEP;
            v = Math.min(balance, Math.max(0, v));
            setPoints(v);
            onChange?.(v);
          }}
          className="w-32 rounded-lg border px-3 py-2 text-sm"
        />
        <span className="text-sm text-gray-600">
          Redeem: <strong>{points.toLocaleString()} pts</strong> ({fmtMoney(dollars)})
        </span>
      </div>

      {/* Action */}
      <div className="mt-4">
        <button
          onClick={redeem}
          disabled={!canRedeem}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Redeeming…" : "Redeem"}
        </button>
      </div>

      {/* Helper / status */}
      {!canRedeem && (
        <div className="mt-2 text-xs text-gray-500">
          Enter a multiple of {STEP}, at least {MIN_REDEEM}, and no more than your balance.
        </div>
      )}
      {msg && <div className="mt-3 text-sm text-indigo-700">{msg}</div>}
    </div>
  );
}
