// middleware.ts (project root)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// ✅ Routes that REQUIRE sign-in
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",                              // Admin app
  "/api/admin(.*)",                          // Admin APIs
  "/review-order",                           // Review order page
  "/checkout",                               // Checkout flow
  "/orders(.*)",                             // Order history / details
  "/account(.*)",                            // Account pages
  "/products/:productId/upload-artwork",     // Artwork upload for any product
  "/api/shipping/estimate",
  "/api/shippingEstimate",
  // add more as needed...
]);

// (Optional) Routes that must remain public for SEO / browse
// Only needed if you plan to add public-only logic.
const isExplicitPublic = createRouteMatcher([
  "/",
  "/categories(.*)",
  "/subcategories(.*)",
  "/products(.*)", // product detail pages should remain browseable
  "/blog(.*)",
]);

export default clerkMiddleware((auth, req) => {
  // If it’s a protected route, enforce sign-in
  if (isProtectedRoute(req)) {
    auth().protect();
  }

  // Otherwise it's public — just continue
  // If you need special logic for explicit public routes, you can check isExplicitPublic(req) here.
});

// ✅ ENSURE the middleware RUNS on your app routes
// This matcher runs on everything except static files and _next assets.
// Then we selectively protect inside the middleware via isProtectedRoute().
export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
