// src/components/RouteProgress.tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

// Optional: tweak the feel
NProgress.configure({ showSpinner: false, trickleSpeed: 120, minimum: 0.08 });

export default function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const isFirst = useRef(true);

  // Start/stop on route changes (App Router friendly)
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    NProgress.start();
    const t = setTimeout(() => NProgress.done(), 400); // short finish after nav renders
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search?.toString()]);

  return null;
}
