// src/components/UploadCta.tsx
"use client";

import { useEffect, useState } from "react";
import ContinueToUploadButton from "./ContinueToUploadButton";

export default function UploadCta({
  productId,
  sides = 1,
}: {
  productId: string | number; // can be number coming from params sometimes
  sides?: number;
}) {
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Reuse a stable order/session id for uploads
    let id = localStorage.getItem("adap_order_id");
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `guest-${Date.now()}`;
      localStorage.setItem("adap_order_id", id);
    }
    setOrderId(id);
  }, []);

  if (!orderId) return null;

  return (
    <div className="mt-4">
      <ContinueToUploadButton
        productId={String(productId)}   // ✅ normalize to string
        orderId={orderId}
      />
      {/* If you want to include sides in the URL: */}
      {/* <ContinueToUploadButton productId={`${productId}?sides=${sides}`} orderId={orderId} /> */}
    </div>
  );
}
