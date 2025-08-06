// src/app/products/[id]/[slug]/ClientOptionsSection.tsx
"use client";

import { useState, useEffect } from "react";
import {
  priceProduct,
  shippingEstimate,
  placeOrder,
} from "@/lib/sinalite";

interface Option {
  id: number;
  name: string;
}

interface Props {
  productId: number;
  storeCode: string;
  optionGroups: Record<string, Option[]>;
  initialSelected: number[];
  initialPrice: string;
  initialPackageInfo: Record<string, any>;
  initialOptionsMap: Record<string, any>;
}

export default function ClientOptionsSection({
  productId,
  storeCode,
  optionGroups,
  initialSelected,
  initialPrice,
  initialPackageInfo,
  initialOptionsMap,
}: Props) {
  const groups = Object.entries(optionGroups); // [ [groupName, options], ... ]
  const [selected, setSelected] = useState<number[]>(initialSelected);
  const [price, setPrice] = useState(initialPrice);
  const [packageInfo, setPackageInfo] = useState(initialPackageInfo);
  const [optionsMap, setOptionsMap] = useState(initialOptionsMap);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whenever `selected` changes, fetch new pricing
  useEffect(() => {
    let cancelled = false;
// sourcery skip: avoid-function-declarations-in-blocks
    async function fetchPrice() {
      setLoadingPrice(true);
      setError(null);
      try {
        const res = await priceProduct(productId, storeCode, selected);
        if (!cancelled) {
          setPrice(res.price);
          setPackageInfo(res.packageInfo);
          setOptionsMap(res.productOptions);
        }
      } catch (e: any) {
        console.error("Pricing error", e);
        if (!cancelled) {
          setError("Could not fetch price. Try again.");
        }
      } finally {
        if (!cancelled) {
          setLoadingPrice(false);
        }
      }
    }
    fetchPrice();
    return () => {
      cancelled = true;
    };
  }, [selected.join(","), productId, storeCode]);

  const handleOptionChange = (groupIndex: number, optionId: number) => {
    setSelected((prev) => {
      const copy = [...prev];
      copy[groupIndex] = optionId;
      return copy;
    });
  };

  const handleOrder = async () => {
    try {
      const orderData = {
        items: [
          {
            productId,
            options: selected,
            files: [], // TODO: wire up file uploads
            extra: "",
          },
        ],
        shippingInfo: {}, // TODO: collect real shipping info
        billingInfo: {},  // TODO: collect real billing info
        notes: "",
      };
      const result = await placeOrder(orderData);
      alert(`Order ${result.status}: #${result.orderId}`);
    } catch (e) {
      console.error("Order error", e);
      alert("Failed to place order. Please try again.");
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Customize Your Product</h2>

      {/* Option selectors */}
      {groups.map(([groupName, options], idx) => (
        <div key={groupName}>
          <label className="block mb-1 font-medium">{groupName}</label>
          <select
            value={selected[idx]}
            onChange={(e) => handleOptionChange(idx, +e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent"
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Pricing & package info */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-inner space-y-2">
        {loadingPrice ? (
          <p>Loading price…</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <>
            <p className="text-xl font-bold">Price: ${parseFloat(price).toFixed(2)}</p>
            <p className="text-sm text-gray-700">
              {Object.entries(packageInfo)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}
            </p>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleOrder}
          disabled={loadingPrice}
          className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold py-3 rounded-md transition disabled:opacity-50"
        >
          Add to Cart
        </button>
        <button
          onClick={handleOrder}
          disabled={loadingPrice}
          className="flex-1 border border-accent text-accent font-bold py-3 rounded-md transition disabled:opacity-50"
        >
          Buy Now
        </button>
      </div>
    </section>
  );
}

