// src/components/ProductOptions.tsx
"use client";
import { useMemo } from "react";

/** Match your SinaLite-normalized shapes */
export type OptionDef = {
  name: string;               // e.g. "Size", "Stock", "Coating"
  code: string;               // e.g. "size", "stock", "coating" (maps to SinaLite field)
  values: Array<{ label: string; value: string }>;
};

export type Selected = Record<string, string>; // { size: "12x18", stock: "14pt", ... }

type Props = {
  options: OptionDef[];                       // from SinaLite options endpoint for this product
  selected: Selected;                         // your current selections
  qty: number;                                // run size / quantity (per SinaLite)
  onChange: (next: { selected: Selected; qty: number }) => void; // bubble changes up
  disabled?: boolean;
};

export default function ProductOptions({ options, selected, qty, onChange, disabled }: Props) {
  const firsts = useMemo(() => {
    const init: Selected = { ...selected };
    for (const g of options) {
      if (init[g.code] == null && g.values.length) init[g.code] = g.values[0].value;
    }
    return init;
  }, [options, selected]);

  return (
    <div className="space-y-3">
      {options.map((group) => (
        <div key={group.code}>
          <label className="block mb-1 font-medium">{group.name}</label>
          <select
            value={firsts[group.code] ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ selected: { ...firsts, [group.code]: e.target.value }, qty })}
            className="w-full border rounded px-3 py-2"
          >
            {group.values.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      ))}

      <div>
        <label className="block mb-1 font-medium">Qty</label>
        <input
          type="number"
          min={1}
          max={999999}
          value={qty}
          disabled={disabled}
          onChange={(e) => onChange({ selected: firsts, qty: Math.max(1, Number(e.currentTarget.value) || 1) })}
          className="w-full border rounded px-3 py-2"
        />
      </div>
    </div>
  );
}
