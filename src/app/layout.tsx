// app/layout.tsx
import "./globals.css";
import Header from "@/components/Header";
import MainNav from "src/components/MainNav";
import SupportBanner from "@/components/SupportBanner";
import Footer from "@/components/Footer"

export const metadata = {
  title: "Custom Print Experts",
  description: "Your one-stop for trade printing—business cards, banners, invitations, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* 1) Top announcement bar */}
        <div className="notification-bar">
          We are currently experiencing high volumes for roll labels and Business cards UV/foil orders. Thank you for your patience!
        </div>

        {/* 2) Secondary account nav */}
        <div className="top-nav">
          <a href="/account">My Account</a>
          <a href="/orders">Order Status</a>
          <a href="/signout">Sign Out</a>
          <a href="/blog">Blog</a>
        </div>

        {/* 3) Primary header with logo, search, icons */}
        <Header />

        {/* 4) Main “hero” nav (categories) */}
        <MainNav />

        {/* 5) Support banner: tickets, call, chat */}
        <SupportBanner />

        {/* 7) Page content */}
        <main>{children}</main>

        {/*8) Footer */}
        <Footer />
      </body>
    </html>
  );
}
