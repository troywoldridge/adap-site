// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/Header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  /** You can override this per-page via page-level `metadata` exports */
  title: {
    default: "Custom Print Experts",
    template: "%s | Custom Print Experts",
  },
  description:
    "Top-class custom printing solutions: business cards, invitations, promotional items and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* --- Global Header (always visible) --- */}
        <Header />

        {/* --- Page-specific content --- */}
        <main>{children}</main>

        {/* --- Optional global Footer can go here
             <Footer />
        --- */}
      </body>
    </html>
  );
}
