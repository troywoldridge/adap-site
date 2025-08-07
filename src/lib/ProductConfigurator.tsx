"use client";
import { useState, useEffect } from "react";
import { priceProduct } from "src/lib/sinalite.client";

interface Option { id: number; name: string }
interface Props {
  productId: number; // was string
  storeCode: string;
  groups: Record<string, Option[]>;
  metaFlags: unknown[];
}


export default function ProductConfigurator({
  productId,
  storeCode,
  groups,
}: Props) {
  // initialize with the first option of each group
  const initial = Object.fromEntries(
    Object.entries(groups).map(([grp, opts]) => [grp, opts[0].id])
  ) as Record<string, number>;

  const [selection, setSelection] = useState(initial);
  const [price, setPrice] = useState<string>("—");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPrice() {
      setLoading(true);
      try {
        const resp = await priceProduct(
          Number(productId),
          storeCode,
          Object.values(selection)
        );
        setPrice(resp.price);
      } catch {
        setPrice("Error");
      } finally {
        setLoading(false);
      }
    }
    fetchPrice();
  }, [selection, productId, storeCode]);

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([grp, opts]) => (
        <div key={grp}>
          <label className="block font-semibold mb-1">{grp}</label>
          <select
            className="border p-2 rounded w-full max-w-xs"
            value={selection[grp]}
            onChange={(e) =>
              setSelection((s) => ({ ...s, [grp]: +e.target.value }))
            }
          >
            {opts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="text-xl font-bold">
        {loading ? "…" : `$${price}`}
      </div>

      <button
        className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        disabled={loading}
      >
        Add to Cart
      </button>
    </div>
  );
}
