// src/components/cart/AddToCartButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart-client";

type Props = {
  productId: string | number;
  qty: number;
  optionsByGroup: Record<string, string | number>;
  displayPrice?: { amount: number; currency: string };
  goToCart?: boolean;
};

export default function AddToCartButton({
  productId,
  qty,
  optionsByGroup,
  displayPrice,
  goToCart = true,
}: Props) {
  const router = useRouter();
  const { addToCart, refresh } = useCart();
  const [adding, setAdding] = useState(false);

  async function onAdd() {
    setAdding(true);
    try {
      await addToCart({
        productId: Number(productId),
        qty,
        optionIdsByGroup: optionsByGroup,
        price: displayPrice?.amount,
        currency: displayPrice?.currency,
      });
      if (goToCart) {
        router.push("/cart");
      } else {
        await refresh();
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <button className="btn btn-primary" onClick={onAdd} disabled={adding}>
      {adding ? "Adding…" : "Add to cart"}
    </button>
  );
}
