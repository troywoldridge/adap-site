// src/app/submit-custom-order/page.tsx
import "server-only";

import type { Viewport } from "next";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ themeColor must be in viewport export (not metadata)
export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function SubmitCustomOrderPage() {
  redirect("/quotes#order");
}
