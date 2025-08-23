// src/middleware.ts
import {
  clerkMiddleware,
  createRouteMatcher,
  type ClerkMiddlewareAuth,
} from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/** Legacy review URLs → canonical /cart/review */
const isLegacyReview = createRouteMatcher([
  "/review-order(.*)",
  "/revieworder(.*)",
  "/order/review(.*)",
]);

/** PROTECTED: Upload routes */
const isProductUpload = createRouteMatcher([
  "/product/:productId/upload-artwork(.*)",
  "/products/:productId/upload-artwork(.*)", // legacy safety
]);

/** PUBLIC: Cart & estimator (UI + API) */
const isPublicCartArea = createRouteMatcher([
  "/cart(.*)",
  "/api/cart/:path*",
  "/api/shipping/estimate(.*)",
  "/api/create-checkout-session", // ⬅ allow guests to start Stripe session
  "/api/sinalite/price/:path*", 
  "/api/checkout/:path*", 
]);

/** ✅ NEW: PUBLIC Sinalite pricing endpoints (per Sinalite docs POST /price/:id/:storeCode) */
const isPublicSinalite = createRouteMatcher([
  "/api/sinalite/price(.*)",     // allow both /price and /price/[id]
  "/api/sinalite/products(.*)",  // optional: product meta/pricing data
]);

/** PROTECTED: App areas */
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
  "/account(.*)",
  "/orders(.*)",
  "/checkout(.*)",
  "/review-order(.*)",
  // Protected APIs:
  "/api/artwork/:path*",
  "/api/uploads/presign(.*)",
  "/api/order/place",
  "/api/orders(.*)",
  "/api/create-checkout-session(.*)" 
]);

export default clerkMiddleware(async (auth: ClerkMiddlewareAuth, req: NextRequest) => {
  if (req.method === "HEAD" || req.method === "OPTIONS") {
    return NextResponse.next();
  }

  if (isLegacyReview(req)) {
    return NextResponse.redirect(new URL("/cart/review", req.url), 308);
  }

  const p = req.nextUrl.pathname;
  const session = await auth();
  const { userId, redirectToSignIn } = session;

  // ✅ Public zones (guest-friendly): cart + Sinalite pricing
  if (isPublicCartArea(req) || isPublicSinalite(req)) {
    return NextResponse.next();
  }

  // Gateways/webhooks bypass
  const isWebhook = p.startsWith("/api/webhooks/") || p.startsWith("/api/stripe/");

  // Require auth for other mutating API calls
  if (p.startsWith("/api/") && req.method !== "GET" && !isWebhook && !userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  // Uploads must be signed in
  if (isProductUpload(req) && !userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Protected app areas
  if (isProtectedRoute(req) && !userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
