"use client";

import { useState } from "react";
import ProductReviewForm from "./ProductReviewForm";
import ProductReviewList from "./ProductReviewList";

export default function ReviewsPanel({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const [refreshToken, setRefreshToken] = useState(0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="order-2 lg:order-1">
        <ProductReviewList productId={productId} refreshSignal={refreshToken} />
      </div>
      <div className="order-1 lg:order-2">
        <ProductReviewForm
          productId={productId}
          productName={productName}
          onSubmitted={() => setRefreshToken((n) => n + 1)}
        />
      </div>
    </div>
  );
}
