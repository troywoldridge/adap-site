import * as React from "react";
import { estimate } from "@/hooks/useShippingEstimate";

export default function CartShippingEstimator({ lines }: { lines: { productId: number; optionIds: (string|number)[] }[] }) {
  const [country, setCountry] = React.useState<"US"|"CA">("US");
  const [state, setState] = React.useState("");
  const [zip, setZip] = React.useState("");
  const [rates, setRates] = React.useState<any[]|null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const data = await estimate({
        shipCountry: country,
        shipState: state,
        shipZip: zip,
        lines,
      });
      setRates(data);
    } catch (err: any) {
      setError(err?.message || "Failed to estimate shipping");
    } finally {
      setLoading(false);
    }
  }

  // ...render your form + rates list...
  return (
    <form onSubmit={onSubmit}>
      {/* your inputs for country/state/zip */}
      <button type="submit" disabled={loading}>
        {loading ? "Estimating..." : "Estimate Shipping"}
      </button>
      {error && <p className="text-red-600">{error}</p>}
      {rates && rates.length > 0 && (
        <ul>
          {rates.map((r, i) => (
            <li key={i}>{r.carrier} — {r.method}: ${r.price} ({r.days ?? "n/a"} days)</li>
          ))}
        </ul>
      )}
    </form>
  );
}
