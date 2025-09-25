// src/app/checkout/success/ClearCartCookie.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClearCartCookie() {
  const router = useRouter();

  useEffect(() => {
    let gone = false;

    async function run() {
      try {
        await fetch("/api/cart/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
      } catch {
        // ignore; we still go to /account
      } finally {
        if (!gone) router.replace("/account");
      }
    }

    run();
    return () => {
      gone = true;
    };
  }, [router]);

  return null;
}
