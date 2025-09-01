import type { Metadata } from "next";
import QuotesClient from "@/components/quotes/QuotesClient";

export const metadata: Metadata = {
  title: "Custom Quotes & Orders | ADAP",
  description:
    "Request a custom quote or submit a custom order. Fast turnaround on estimates and white-glove project handling.",
};

export default function Page() {
  // Server component: safe place for metadata export
  return <QuotesClient />;
}

