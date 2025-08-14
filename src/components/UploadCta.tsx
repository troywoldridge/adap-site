"use client";

import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import ContinueToUploadButton from "./ContinueToUploadButton";

export default function UploadCta({
  productId,
  sides = 1,
}: {
  productId: string | number;
  sides?: number;
}) {
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
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

  if (!orderId) {
    return null;
  }

  const pid = String(productId);
  const uploadUrl = `/product/${encodeURIComponent(pid)}/upload-artwork?sides=${encodeURIComponent(
    String(sides)
  )}&orderId=${encodeURIComponent(orderId)}`;

  return (
    <div className="mt-4">
      <SignedIn>
        <ContinueToUploadButton productId={pid} orderId={orderId} sides={sides} />
      </SignedIn>

      <SignedOut>
        <SignInButton
          mode="modal"
          withSignUp
          forceRedirectUrl={uploadUrl}
          fallbackRedirectUrl={uploadUrl}
          signUpForceRedirectUrl={uploadUrl}
          signUpFallbackRedirectUrl={uploadUrl}
        >
          <button type="button" className="btn btn-primary">
            Sign in to upload artwork
          </button>
        </SignInButton>
      </SignedOut>
    </div>
  );
}
