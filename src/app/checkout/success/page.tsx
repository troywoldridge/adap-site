"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SuccessPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("Finalizing your order…");

  useEffect(() => {
    const session_id = sp.get("session_id") || "";
    if (!session_id) {
      setMsg("Missing session — sending you to your account…");
      const t = setTimeout(() => router.replace("/account"), 1200);
      return () => clearTimeout(t);
    }

    (async () => {
      try {
        const r = await fetch(`/api/checkout/finalize?session_id=${encodeURIComponent(session_id)}`, { cache: "no-store" });
        const j = await r.json();
        if (j.ok) {
          setMsg("Done! Redirecting to your account…");
          router.replace(j.redirect || "/account");
        } else {
          setMsg("Order finalized, opening your account…");
          router.replace("/account");
        }
      } catch {
        router.replace("/account");
      }
    })();
  }, [sp, router]);

  return (
    <main style={{ maxWidth: 680, margin: "40px auto", padding: "0 16px" }}>
      <h1>Thanks for your order! 🎉</h1>
      <p>{msg}</p>
    </main>
  );
}
