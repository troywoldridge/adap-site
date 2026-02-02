import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import OnboardingClient from "./OnboardingClient";

export const metadata: Metadata = {
  title: "Account Onboarding • ADAP",
  description: "Finish setting up your account to unlock faster checkout.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading…</div>}>
      <OnboardingClient />
    </Suspense>
  );
}
