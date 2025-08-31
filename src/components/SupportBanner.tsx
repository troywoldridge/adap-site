// src/components/SupportBanner.tsx
"use client";

import Link from "next/link";

export default function SupportBanner() {
  return (
    <div className="bg-blue-600 text-white py-3">
      <div className="mx-auto max-w-7xl px-4">
        <nav className="flex flex-wrap justify-center gap-6 text-sm font-medium">
          <Link
            href="/support/ticket"
            className="flex items-center gap-2 hover:text-yellow-300 transition"
          >
            <span role="img" aria-label="ticket">✉️</span>
            <span>Create a Support Ticket</span>
          </Link>

          <Link
            href="tel:1-866-899-2499"
            className="flex items-center gap-2 hover:text-yellow-300 transition"
          >
            <span role="img" aria-label="phone">📞</span>
            <span>+1 606-541-0989</span>
          </Link>

          <Link
            href="/support/chat"
            className="flex items-center gap-2 hover:text-yellow-300 transition"
          >
            <span role="img" aria-label="chat">💬</span>
            <span>Chat with an Agent</span>
          </Link>

          <Link
            href="/support"
            className="flex items-center gap-2 hover:text-yellow-300 transition"
          >
            <span role="img" aria-label="help">❓</span>
            <span>Support Center</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
