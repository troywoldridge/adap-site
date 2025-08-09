import Link from "next/link";
export default function TopNav() {
  return (
    <nav className="top-nav" aria-label="Account Navigation">
      <Link href="/account">My Account</Link>
      <Link href="/orders">Order Status</Link>
      <Link href="/signout">Sign Out</Link>
      <Link href="/blog">Blog</Link>
    </nav>
  );
}
