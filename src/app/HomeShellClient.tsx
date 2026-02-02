"use client";

import { Suspense } from "react";

export default function HomeShellClient({ children }: { children: React.ReactNode }) {
  // ✅ Any accidental useSearchParams() in children now has a suspense boundary above it.
  return <Suspense fallback={null}>{children}</Suspense>;
}
