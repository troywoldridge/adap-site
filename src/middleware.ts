// src/middleware.ts
import {
  clerkMiddleware,
  createRouteMatcher,
  type ClerkMiddlewareAuth,
} from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

// Legacy review paths → /cart/review
const isLegacyReview = createRouteMatcher([
  "/review-order(.*)",
  "/revieworder(.*)",
  "/order/review(.*)",
]);

// PROTECTED: Upload route
const isProductUpload = createRouteMatcher([
  "/product/:productId/upload-artwork(.*)",
  "/products/:productId/upload-artwork(.*)", // legacy safety
]);

// PROTECTED: App areas
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
  "/account(.*)",
  "/orders(.*)",
  "/checkout(.*)",
  "/cart/review(.*)",
  "/review-order(.*)",
  // Protected APIs:
  "/api/artwork/:path*",
  "/api/uploads/presign(.*)",
  "/api/order/place",
  "/api/orders(.*)",
]);

export default clerkMiddleware(async (auth: ClerkMiddlewareAuth, req: NextRequest) => {
  if (req.method === "HEAD" || req.method === "OPTIONS") {
    return NextResponse.next();
  }

  // 0) Legacy → canonical redirect
  if (isLegacyReview(req)) {
    return NextResponse.redirect(new URL("/cart/review", req.url), 308);
  }

  const p = req.nextUrl.pathname;

  // Resolve session once (TS expects Promise here)
  const session = await auth();
  const { userId, redirectToSignIn } = session;

  // Allow guest mutations for these endpoints (everything else non-GET under /api requires auth)
  const allowsGuestMutation =
    p.startsWith("/api/cart") || p.startsWith("/api/shipping/estimate");
  const isWebhook = p.startsWith("/api/webhooks/") || p.startsWith("/api/stripe/");

  // 1) Require auth for mutating API calls (non-GET), except webhooks/Stripe and allowlist
  if (p.startsWith("/api/") && req.method !== "GET" && !isWebhook && !allowsGuestMutation && !userId) {
        return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  // 2) Uploads must be signed in
  if (isProductUpload(req) && !userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // 3) App protected areas must be signed in
  if (isProtectedRoute(req) && !userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
