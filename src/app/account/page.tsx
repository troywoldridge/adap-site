// src/app/account/page.tsx
import AccountClient from "@/app/account/AccountClient";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <main className="container py-8">
      <h1 className="h1">My Account</h1>
      <AccountClient />
    </main>
  );
}
