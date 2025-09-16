// src/components/CartCreditsRow.tsx
// server component (no hooks needed) — safe to render inside Review page
type Props = {
  /** Credits to apply in CENTS (e.g. 1500 => $15.00). If 0 or less, renders nothing. */
  creditsCents?: number;
  /** ISO currency (display only). Pricing/estimator remain per SinaLite API docs. */
  currency?: "USD" | "CAD";
  /** Optional callback if you later add an “edit/remove credits” UI. */
  onChanged?: () => void;
};

function moneyFmt(amount: number, currency: "USD" | "CAD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export default function CartCreditsRow({
  creditsCents = 0,
  currency = "USD",
}: Props) {
  const credits = Math.max(0, Math.floor(Number(creditsCents)) / 100);
  if (credits <= 0) return null;

  return (
    <div className="flex justify-between py-2 text-emerald-700">
      <span className="font-medium">Loyalty credits</span>
      <span>-{moneyFmt(credits, currency)}</span>
    </div>
  );
}
