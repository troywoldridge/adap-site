export const dynamic = "force-dynamic";

import ProceedToCheckout from "@/components/ProceedToCheckout";

export default function CheckoutPage() {
  return (
    <main className="container cart-container" style={{ maxWidth: 720, margin: "40px auto" }}>
      <h1>Checkout</h1>
      <p>Review your order and continue to secure payment.</p>
      <ProceedToCheckout label="Pay with card" />
    </main>
  );
}
