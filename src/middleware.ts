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

/** PUBLIC: cart UI + cart APIs + estimator + Sinalite pricing */
const isPublicCartArea = createRouteMatcher([
  "/cart(.*)",
  "/api/cart/:path*",
  "/api/cart/estimate-shipping(.*)",
]);

const isPublicSinalite = createRouteMatcher([
  "/api/sinalite/price(.*)",
  "/api/sinalite/products(.*)",
]);

/** PROTECTED app areas (require sign-in) */
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
  "/account(.*)",
  "/orders(.*)",
  "/checkout(.*)",
  "/cart/review(.*)",
  // protected APIs that mutate or read user data:
  "/api/artwork/:path*",
  "/api/uploads/:path*",
  "/api/order/:path*",
  "/api/orders/:path*",
  "/api/checkout/:path*",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // pass-thru for trivial requests
  if (req.method === "HEAD" || req.method === "OPTIONS") {
    return NextResponse.next();
  }

  // Canonicalize legacy review routes
  if (isLegacyReview(req)) {
    return NextResponse.redirect(new URL("/cart/review", req.url), 308);
  }

  const { userId, redirectToSignIn } = await auth();
  const pathname = req.nextUrl.pathname;

  // Public zones
  if (isPublicCartArea(req) || isPublicSinalite(req)) {
    return NextResponse.next();
  }

  // Gateway/webhooks bypass
  const isWebhook = pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/stripe/");

  // Require auth for non-GET API calls (unless webhook)
  if (pathname.startsWith("/api/") && req.method !== "GET" && !isWebhook && !userId) {
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
