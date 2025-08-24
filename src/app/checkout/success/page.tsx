// src/app/checkout/success/page.tsx
import "server-only";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SuccessPage() {
  // ✨ server only renders confirmation; a small client component clears cart
  return (
    <main className="success">
      <h1 className="success__title">Payment received — thank you!</h1>
      <p className="success__subtitle">We’re queuing your order now.</p>

      <div className="success__card">
        <ul className="success__list">
          <li>We’re locking your artwork and submitting to production.</li>
          <li>You’ll get an email as soon as your order is confirmed.</li>
        </ul>
        <div className="success__actions">
          <Link className="btn btn--primary" href="/account">View my orders</Link>
          <Link className="btn btn--ghost" href="/">Keep shopping</Link>
        </div>
      </div>

      {/* This triggers cookie clearing + server-side cart housekeeping */}
      <ClearCartClient />
    </main>
  );
}

function ClearCartClient() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
        (function(){
          fetch('/api/cart/clear', { method: 'POST' }).catch(()=>{});
        })();
      `,
      }}
    />
  );
}
