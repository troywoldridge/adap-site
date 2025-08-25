"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EnsureSessionGate() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await fetch("/api/session/ensure", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
        });
      } catch {/* ignore */}
      if (active) router.refresh();
    })();
    return () => { active = false; };
  }, [router]);

  return (
    <main className="container" style={{ padding: 24 }}>
      <h1>Preparing upload…</h1>
      <p className="muted">Setting up your session so we can attach files to your cart.</p>
    </main>
  );
}
