// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 🔐 Protected areas (sign-in required)
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
  "/review-order",
  "/checkout",
  "/orders(.*)",
  "/account(.*)",

  // ✅ Upload artwork (singular path)
  "/product/:productId/upload-artwork",

  // (Optional) keep old plural path for backward compatibility
  "/products/:productId/upload-artwork",

  "/api/artwork/:path*",
  // Optional but recommended: protect presign uploads too
  // "/api/r2/presign",
]);

// 🌐 Public API (no auth) — pricing & shipping stay open per Sinalite API usage
const isPublicApiRoute = createRouteMatcher([
  "/api/products/:path*", // product + shipping endpoints
  "/api/sinalite/:path*", // pricing proxy/calls to Sinalite
]);

// 📰 Public pages (browsing is open)
const isExplicitPublic = createRouteMatcher([
  "/",
  "/categories(.*)",
  "/subcategories(.*)",
  "/product(.*)",   // ✅ singular product pages explicitly public
  "/products(.*)",  // (if you have any plural routes left around)
  "/blog(.*)",
  "/search(.*)",
  "/shipping(.*)",
  "/shipping-info(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow preflight & HEAD
  if (req.method === "HEAD" || req.method === "OPTIONS") {
    return NextResponse.next();
  }

  // Public APIs & pages flow through
  if (isPublicApiRoute(req) || isExplicitPublic(req)) {
    return NextResponse.next();
  }

  // Enforce auth on protected routes (Clerk v5)
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Default allow
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
