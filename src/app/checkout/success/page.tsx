import Link from "next/link";
import ClearCartCookie from "./ClearCartCookie";

export const revalidate = 0;                // number or false (valid)
export const dynamic = "force-dynamic";     // keep this if you want no caching

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <main className="container" style={{ maxWidth: 880, margin: "24px auto" }}>
      <ClearCartCookie />

      <h1 style={{ marginBottom: 8 }}>Thanks for your order!</h1>
      {session_id ? (
        <p style={{ color: "#64748b", marginTop: 0 }}>
          Stripe session: <code>{session_id}</code>
        </p>
      ) : null}

      <p style={{ marginTop: 16 }}>
        You can view details on <Link href="/orders">Your Orders</Link>.
      </p>

      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <Link href="/orders" className="btn btn-primary">View Orders</Link>
        <Link href="/" className="btn">Continue Shopping</Link>
      </div>
    </main>
  );
}
