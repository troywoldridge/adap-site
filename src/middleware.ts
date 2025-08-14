// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ---- PROTECTED (must be signed in) ----
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",

  "/account(.*)",
  "/orders(.*)",
  "/checkout(.*)",
  "/review-order(.*)",

  // Artwork upload page(s)
  "/product/:productId/upload-artwork(.*)", // current (singular)
  "/products/:productId/upload-artwork(.*)", // legacy (plural), just in case

  // Artwork + order APIs that should require auth
  "/api/artwork/:path*",
  "/api/r2/presign(.*)",
  "/api/order/place",
  "/api/orders(.*)",
]);

// ---- PUBLIC API (no auth) ----
const isPublicApiRoute = createRouteMatcher([
  "/api/products/:path*",   // your product endpoints / shipping
  "/api/sinalite/:path*",   // pricing endpoints
  "/api/stripe/:path*",     // webhooks, etc. must be publicly reachable
  "/api/hero-analytics",    // if you add this later, keep public
]);

// ---- PUBLIC PAGES ----
const isExplicitPublic = createRouteMatcher([
  "/",
  "/search(.*)",
  "/categories(.*)",
  "/subcategories(.*)",

  // Product pages are public; only the *upload* sub-route is protected
  "/product(.*)",
  "/products(.*)",

  "/blog(.*)",
  "/shipping(.*)",
  "/shipping-info(.*)",

  // Auth pages always public
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Always let preflight/HEAD pass
  if (req.method === "HEAD" || req.method === "OPTIONS") {
    return NextResponse.next();
  }

  // Let public APIs + public pages through
  if (isPublicApiRoute(req) || isExplicitPublic(req)) {
    return NextResponse.next();
  }

  // Enforce auth on protected routes
  if (isProtectedRoute(req)) {
    const au = await auth(); // NOTE: call and await the helper to get the result
    if (!au.userId) {
      return au.redirectToSignIn();
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
