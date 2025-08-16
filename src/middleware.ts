// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ── Early redirect: legacy review paths → /cart/review
const isLegacyReview = createRouteMatcher([
  "/review-order(.*)",
  "/revieworder(.*)",
  "/order/review(.*)",
]);

// ── PROTECTED: Upload route (signed-in required)
const isProductUpload = createRouteMatcher([
  "/product/:productId/upload-artwork(.*)",
  "/products/:productId/upload-artwork(.*)", // legacy safety
]);

// ── PROTECTED: App areas
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
  "/account(.*)",
  "/orders(.*)",
  "/checkout(.*)",
  "/cart/review(.*)",      // canonical review page
  "/review-order(.*)",     // legacy review (still protected if hit directly)
  "/api/artwork/:path*",
  "/api/r2/presign(.*)",
  "/api/order/place",
  "/api/orders(.*)",
]);

// ── PUBLIC API (no auth)
const isPublicApiRoute = createRouteMatcher([
  "/api/products/:path*",
  "/api/sinalite/:path*",
  "/api/stripe/:path*",
  "/api/hero-analytics",
  "/api/sessions(.*)",
  "/api/shipping/estimate(.*)",
  "/api/cart/:path*",
  "/api/artwork/:path*",    
]);

// ── PUBLIC PAGES
const isExplicitPublic = createRouteMatcher([
  "/",
  "/search(.*)",
  "/categories(.*)",
  "/subcategories(.*)",
  "/blog(.*)",
  "/shipping(.*)",
  "/shipping-info(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (req.method === "HEAD" || req.method === "OPTIONS") {
    return NextResponse.next();
  }

  // 0) Legacy → canonical
  if (isLegacyReview(req)) {
    const url = new URL("/cart/review", req.url);
    return NextResponse.redirect(url, { status: 308 });
  }

  // 1) Upload route must be signed in
  if (isProductUpload(req)) {
    const au = await auth();
    if (!au.userId) {
      return au.redirectToSignIn({ returnBackUrl: req.url });
    }
    return NextResponse.next();
  }

  // 2) Public APIs + explicit public pages
  if (isPublicApiRoute(req) || isExplicitPublic(req)) {
    return NextResponse.next();
  }

  // 3) Other protected routes
  if (isProtectedRoute(req)) {
    const au = await auth();
    if (!au.userId) {
      return au.redirectToSignIn({ returnBackUrl: req.url });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
