// src/components/SupportBanner.tsx
"use client";

import Link from "next/link";

export default function SupportBanner() {
  return (
    <div className="support-banner">
      <Link href="/support/ticket">
        <span>✉️</span> Create a Support Ticket
      </Link>
      <Link href="tel:1-866-899-2499">
        <span>📞</span> Call 1-866-899-2499
      </Link>
      <Link href="/support/chat">
        <span>💬</span> Chat with an Agent
      </Link>
      <Link href="/support">
        <span>❓</span> Go to Support Center
      </Link>
    </div>
  );
}
