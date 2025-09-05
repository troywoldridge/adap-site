"use client";

import { useEffect, useState } from "react";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone };

function normalizeTone(input: unknown): ToastTone {
  const s = String(input ?? "").toLowerCase();
  return s === "success" || s === "error" || s === "info" ? (s as ToastTone) : "info";
}

export default function ClientToastHub() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let seq = 1;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      const message = String(detail.message ?? detail.text ?? "");
      if (!message) return;

      const tone = normalizeTone(detail.type ?? detail.tone);
      const t: Toast = { id: seq++, message, tone };

      setToasts((prev) => [...prev, t]);

      // Auto-dismiss after 2.5s
      const timeout = setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 2500);

      // If you want to allow sticky toasts: pass detail.sticky=true and skip timeout
      if (detail.sticky) clearTimeout(timeout);
    };

    // Support new + legacy event names
    window.addEventListener("adap:toast", handler as EventListener);
    window.addEventListener("cart:toast", handler as EventListener);

    return () => {
      window.removeEventListener("adap:toast", handler as EventListener);
      window.removeEventListener("cart:toast", handler as EventListener);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "rounded-md px-3 py-2 text-sm shadow-md",
            t.tone === "error"
              ? "bg-red-600 text-white"
              : t.tone === "success"
              ? "bg-green-600 text-white"
              : "bg-gray-900 text-white",
          ].join(" ")}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
