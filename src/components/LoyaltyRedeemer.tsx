// src/components/LoyaltyRedeemer.tsx
"use client";
import * as React from "react";

export default function LoyaltyRedeemer({
  balance,
  currency,
  onChange,
}: {
  balance: number;
  currency: "USD" | "CAD";
  onChange?: (points: number) => void;
}) {
  const [points, setPoints] = React.useState(0);
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  const dollars = points / 100;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="h-small">Loyalty</div>
      <div className="muted" style={{ fontSize: 12 }}>Balance: {balance.toLocaleString()} pts</div>
      <input
        type="range"
        min={0}
        max={balance}
        step={50}
        value={points}
        onChange={(e) => {
          const v = Math.min(balance, Math.max(0, Number(e.currentTarget.value)));
          setPoints(v);
          onChange?.(v);
        }}
        style={{ width: "100%", marginTop: 8 }}
      />
      <div className="mt-1">
        Redeem: <strong>{points.toLocaleString()} pts</strong> ({fmt(dollars)})
      </div>
    </div>
  );
}
