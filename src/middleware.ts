// middleware.ts (project root)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that REQUIRE sign-in
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
  "/review-order",
  "/checkout",
  "/orders(.*)",
  "/account(.*)",
  "/products/:productId/upload-artwork",
  "/api/shipping/estimate",
  "/api/shippingEstimate",
  "/api/order/place",
  "/api/orders(.*)",
]);

// (Optional) public routes kept for SEO/browse
const isExplicitPublic = createRouteMatcher([
  "/",
  "/categories(.*)",
  "/subcategories(.*)",
  "/products(.*)",
  "/blog(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const session = await auth(); // ✅ await the async auth()
    if (!session.userId) {
      // Redirect unauthenticated users to sign-in
      return session.redirectToSignIn();
    }
  }
  // else public — fall through
});

// Ensure middleware runs on app routes (exclude _next assets and files)
export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
