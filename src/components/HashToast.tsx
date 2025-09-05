"use client";

import { useEffect, useState } from "react";

type ToastTone = "success" | "error" | "info";
type Toast = { type: ToastTone; message: string };

function parseHash(hash: string): Record<string, string> {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const out: Record<string, string> = {};
  for (const part of h.split("&")) {
    if (!part) continue;
    const [k, v] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "1";
  }
  return out;
}

export default function HashToast() {
  const [fallback, setFallback] = useState<Toast | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fireFromHash = () => {
      const map = parseHash(window.location.hash || "");
      let toast: Toast | null = null;

      if (map.checkout_error) {
        const msg = map.checkout_error.replace(/^http_/, "HTTP ").replace(/_/g, " ");
        toast = { type: "error", message: `Checkout failed: ${msg}` };
      } else if (map.checkout_success === "1") {
        toast = { type: "success", message: "Checkout completed successfully!" };
      } else if (map.checkout_cancelled === "1") {
        toast = { type: "info", message: "Checkout cancelled." };
      }

      if (toast) {
        // Notify your ClientToastHub listener
        window.dispatchEvent(
          new CustomEvent("adap:toast", { detail: { type: toast.type, message: toast.message } })
        );

        // Show a minimal inline banner if nothing catches the event
        setTimeout(() => setFallback(toast!), 50);

        // Clear the hash so refreshes don’t retrigger
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };

    fireFromHash(); // run on mount
    window.addEventListener("hashchange", fireFromHash); // optional: respond to later changes
    return () => window.removeEventListener("hashchange", fireFromHash);
  }, []);

  if (!fallback) return null;

  return (
    <div
      role="status"
      className={`mb-4 rounded border px-4 py-3 ${
        fallback.type === "success"
          ? "border-green-300 bg-green-50 text-green-900"
          : fallback.type === "error"
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-blue-300 bg-blue-50 text-blue-900"
      }`}
    >
      {fallback.message}
    </div>
  );
}
