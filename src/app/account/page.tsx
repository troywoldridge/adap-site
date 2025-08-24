// src/app/account/page.tsx
import "server-only";
import type { Metadata } from "next";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Your Account • Orders",
};

export default async function AccountPage() {
  // (Auth is enforced by middleware; keep this page simple/fast.)
  return (
    <main className="account">
      <header className="account__header">
        <div>
          <h1 className="account__title">Your Orders</h1>
          <p className="account__subtitle">Track, reorder, and download your artwork.</p>
        </div>
      </header>

      {/* Client renderer handles fetching, filters, pagination */}
      <section className="account__content">
        <AccountClient />
      </section>
    </main>
  );
}
