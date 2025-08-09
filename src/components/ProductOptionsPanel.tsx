"use client";
import { useState } from "react";
import type { Product } from "@/types/product";

interface OptionGroup {
  name: string;
  label: string;
  options: string[];
}
interface Props {
  product: Product;
}

export default function ProductOptionsPanel({ product }: Props) {
  // You will want to replace below with dynamic option fetch, but for demo:
  const optionGroups: OptionGroup[] = [
    { name: "stock", label: "Stock", options: product.stockOptions || ["Default Stock"] },
    { name: "size", label: "Size", options: product.sizeOptions || ["12 x 18", "18 x 24"] },
    // ...more options as per Sinalite
  ];

  const [form, setForm] = useState({
    stock: optionGroups[0].options[0],
    size: optionGroups[1].options[0],
    qty: 1,
    // ...other options
  });

  // Fake price calculation for now, replace with real API call
  const basePrice = 4.41;
  const qty = Number(form.qty) || 1;
  const price = (basePrice * qty).toFixed(2);

  return (
    <aside className="product-options-panel border p-5 rounded-lg min-w-[320px] max-w-[420px] bg-white shadow-lg">
      <h2 className="text-lg font-semibold mb-3">Price this item:</h2>
      {optionGroups.map(group => (
        <div key={group.name} className="mb-3">
          <label className="block mb-1 font-medium">{group.label}</label>
          <select
            value={form[group.name as keyof typeof form]}
            onChange={e => setForm(f => ({ ...f, [group.name]: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          >
            {group.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      ))}
      <div className="mb-3">
        <label className="block mb-1 font-medium">Qty</label>
        <input
          type="number"
          min={1}
          max={999}
          value={form.qty}
          onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      {/* Placeholders for grommets, custom size, etc */}
      <button className="w-full bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 rounded mb-2">
        Upload your artwork
      </button>
      <div className="text-xl font-bold text-blue-800 mt-4 mb-2">Regular Price: ${price}</div>
      <button className="w-full border mt-1 py-2 rounded bg-gray-100 hover:bg-gray-200 font-semibold">
        Calculate shipping cost
      </button>
      <button className="w-full border mt-2 py-2 rounded bg-gray-100 hover:bg-gray-200 font-semibold">
        Markup calculator
      </button>
      {/* Lead times, promos, warnings */}
      <div className="mt-4 text-xs text-gray-600">
        <strong>Order now</strong> and this item is estimated to be ready to ship by <span className="text-black">Monday, Aug 11 at 5 PM</span>
      </div>
      <div className="mt-2 text-red-700 text-xs font-semibold">
        SAVE 20% when you order Qty 5+
      </div>
    </aside>
  );
}
