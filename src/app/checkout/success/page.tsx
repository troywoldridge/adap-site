// src/app/checkout/success/page.tsx
export default function Success() {
  return (
    <main className="container mx-auto max-w-2xl py-12">
      <h1 className="text-2xl font-semibold">Thank you! 🎉</h1>
      <p className="mt-2 text-neutral-700">Your order is confirmed. A receipt has been emailed.</p>
      <a
        href="/orders"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white shadow hover:bg-blue-800"
      >
        View orders
      </a>
    </main>
  );
}
