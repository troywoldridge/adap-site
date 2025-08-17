// src/components/product/ProductBuyBox.tsx
"use client";

import { useState } from "react";
import ProductConfigurator from "@/components/product/ProductConfigurator";
import AddToCartButton from "@/components/cart/AddToCartButton";

export type OptionValue = string | number;
export type OptionsByGroup = Record<string, OptionValue>;

type Props = {
  productId: string;
  optionGroups: any; // from normalizeOptionGroups
};

export default function ProductBuyBox({ productId, optionGroups }: Props) {
  // TEMP: until ProductConfigurator exposes callbacks, hold qty locally
  const [qty, setQty] = useState<number>(1);

  // TEMP: optionsByGroup unknown without callbacks; keep empty for now
  const [optionsByGroup] = useState<OptionsByGroup>({});

  return (
    <div className="right-rail">
      <ProductConfigurator productId={productId} options={optionGroups} />

      {/* Simple qty control (globals.css handles styles) */}
      <div className="cart-qty-row">
        <button
          className="qty-btn"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="qty-display">{qty}</span>
        <button
          className="qty-btn"
          onClick={() => setQty((q) => q + 1)}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <div className="divider" />

      <AddToCartButton
        productId={productId}
        qty={qty}
        optionsByGroup={optionsByGroup}
        // displayPrice omitted until we can receive live price
      />
    </div>
  );
}
