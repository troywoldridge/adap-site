"use client";

import { useCallback } from "react";

type Props = {
  productName: string;
  startingPrice?: string; // e.g. "$29.99"
  cta?: string;          // default "Customize & Price"
  targetId?: string;     // default "buy-box"
};

export default function MobileAddToCartBar({
  productName,
  startingPrice,
  cta = "Customize & Price",
  targetId = "buy-box",
}: Props) {
  const onClick = useCallback(() => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const input = el.querySelector("input, select, button") as HTMLElement | null;
      if (input) setTimeout(() => input.focus({ preventScroll: true }), 350);
    }
  }, [targetId]);

  return (
    <div
      className="
        fixed inset-x-0 bottom-0 z-[70] md:hidden
        border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80
        px-4 py-3
        [padding-bottom:calc(env(safe-area-inset-bottom,0)+0.75rem)]
      "
      role="region"
      aria-label="Mobile purchase actions"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-900">{productName}</div>
          {startingPrice ? (
            <div className="text-xs text-gray-600">
              From <span className="font-semibold text-gray-900">{startingPrice}</span>
            </div>
          ) : (
            <div className="text-xs text-gray-500">Configure options to see price</div>
          )}
        </div>

        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          aria-controls={targetId}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
