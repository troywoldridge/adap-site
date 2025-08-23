// src/components/ProceedToCheckout.tsx
"use client";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function ProceedToCheckout() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  return (
    <button
      className="btn btn-primary"
      onClick={() => {
        if (!isSignedIn) router.push("/sign-in?redirect_url=/checkout");
        else router.push("/checkout");
      }}
    >
      Proceed to Checkout
    </button>
  );
}
